// ─── Suivi de colis UBN (cron, PULL) ─────────────────────────────────────────────
//
// UBN n'expose PAS d'endpoint API pour interroger le statut (leur API Distant est en PUSH :
// c'est le rôle du callback ubn-status-sync.js, qui suppose qu'UBN l'a activé chez eux).
// Pour ne dépendre de personne, on LIT ici leur page de suivi PUBLIQUE — le statut est rendu
// côté serveur dans le HTML (aucun nonce/JS/cookie) : GET ubn-speed.fr/suivi-colis/?ubn_tracking=<n°>.
//
// ⚠️ CE MODULE NE VERSE PAS L'ARGENT. Il pose seulement 'delivered' + delivered_at (comme le suivi
// Chronopost). C'est release-delivered.js (cron) qui verse le vendeur 48h APRÈS, avec toutes les
// gardes anti-double-paiement. Séparation stricte logistique / argent.
//
// SÉCURITÉ FAUX POSITIF (= versement à tort) : on ne matche « livré » QUE dans le flux d'historique
// (éléments .ubnta-history-status), JAMAIS dans le texte explicatif de la page, et UNIQUEMENT sur des
// libellés EXACTS partagés avec le callback (_ubn-status.js). Un libellé inconnu → aucune action → le
// colis reste 'shipped' → filet 12j (auto-refund) → traitement manuel. Zéro perte, jamais de versement inventé.
//
// Statuts : paid → shipped → delivered → (48h) → completed. Idempotent (transition atomique depuis 'shipped').
// Lancé par cron Netlify. Auth : header x-nout-cron = CRON_SECRET (invocation planifiée = pas de httpMethod).

const { createClient } = require('@supabase/supabase-js')
const { classifyUbnStatuses } = require('./_ubn-status')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SITE_URL = process.env.URL || 'https://nout.re'
const UBN_SUIVI_URL = 'https://ubn-speed.fr/suivi-colis/'

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NOUT <contact@nout.re>', to, subject, html }),
    })
  } catch (e) { console.error('[ubn-tracking] email:', e.message) }
}

// Extrait UNIQUEMENT le flux de statuts d'historique de la page de suivi (classe .ubnta-history-status),
// balises internes retirées. C'est le flux brut des statuts UBN — jamais le texte explicatif de la page.
function extractStatusStream(html) {
  const out = []
  const re = /class="[^"]*ubnta-history-status[^"]*"[^>]*>([\s\S]*?)<\//gi
  let m
  while ((m = re.exec(html)) !== null) {
    const t = m[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
    if (t) out.push(t)
  }
  return out
}

// Récupère le flux de statuts d'un colis. Renvoie un tableau de libellés (vide si indisponible).
async function fetchStatusStream(trackingNumber) {
  const url = `${UBN_SUIVI_URL}?ubn_tracking=${encodeURIComponent(trackingNumber)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NOUT-tracking/1.0 (+https://nout.re)', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  return extractStatusStream(html)
}

exports.handler = async (event) => {
  // Auth cron (invocation planifiée Netlify = pas de httpMethod ; appel HTTP direct = secret requis)
  if (event.httpMethod) {
    const secret = process.env.CRON_SECRET
    if (!secret || event.headers['x-nout-cron'] !== secret) {
      return { statusCode: 401, body: 'Non autorisé.' }
    }
  }

  console.log('📦 ubn-tracking démarré', new Date().toISOString())

  // Colis expédiés via UBN, pas encore livrés, avec un vrai n° de suivi UBN (USR…-RE).
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, buyer_id, ubn_tracking_number, listing:listings!listing_id(title)')
    .eq('status', 'shipped')
    .eq('carrier', 'ubn')
    .not('ubn_tracking_number', 'is', null)
    .order('shipped_at', { ascending: true, nullsFirst: true })  // les plus anciens d'abord : jamais affamés
    .limit(40)

  if (error) {
    console.error('ubn-tracking : lecture orders échouée :', error.message)
    return { statusCode: 500, body: 'Erreur lecture base.' }
  }
  if (!orders || orders.length === 0) {
    return { statusCode: 200, body: 'Aucune commande UBN à suivre.' }
  }

  let delivered = 0, failed = 0, checked = 0, errors = 0

  for (const order of orders) {
    const tracking = order.ubn_tracking_number
    if (!tracking) continue
    checked++
    try {
      const stream = await fetchStatusStream(tracking)
      const verdict = classifyUbnStatuses(stream)   // 'delivered' | 'failed' | null
      if (!verdict) { await sleep(300); continue }   // en transit / inconnu → rien (sûr)

      if (verdict === 'delivered') {
        // ── LIVRÉ ── shipped → delivered + delivered_at. Transition ATOMIQUE (ne verse RIEN ici :
        // release-delivered libère 48h après). .eq('status','shipped') = jamais écraser disputed/completed/refunded.
        const { data: updated, error: updErr } = await supabase
          .from('orders')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('id', order.id)
          .eq('status', 'shipped')
          .select('id')
        if (updErr) { console.error(`ubn-tracking : update delivered (order ${order.id}) :`, updErr.message); errors++; await sleep(300); continue }
        if (!updated || !updated.length) { await sleep(300); continue } // déjà bougé ailleurs
        delivered++
        console.log(`✅ Order ${order.id} livrée (UBN) → delivered`)
        if (order.buyer_id) {
          fetch(`${SITE_URL}/.netlify/functions/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
            body: JSON.stringify({
              receiver_id: order.buyer_id,
              title: 'Colis livré — NOUT 974',
              body: `${order.listing?.title ?? 'Ton article'} a été livré. Un souci ? Signale-le sous 48h.`,
              url: '/commandes?tab=achats',
            }),
          }).catch((e) => console.error('ubn-tracking send-push:', e.message))
        }
      } else if (verdict === 'failed') {
        // ── ÉCHEC / ANNULATION ── gel en litige pour examen admin (AUCUN mouvement d'argent auto).
        const { data: frozen, error: frzErr } = await supabase
          .from('orders')
          .update({ status: 'disputed' })
          .eq('id', order.id)
          .eq('status', 'shipped')
          .select('id')
        if (frzErr) { console.error(`ubn-tracking : update disputed (order ${order.id}) :`, frzErr.message); errors++; await sleep(300); continue }
        if (frozen && frozen.length) {
          failed++
          console.warn(`ubn-tracking : order ${order.id} échec livraison UBN → disputed`)
          await sendEmail('contact@nout.re', `Livraison UBN échouée — commande ${order.id}`,
            `<p>La livraison UBN de la commande <strong>${escHtml(order.id)}</strong> (« ${escHtml(order.listing?.title ?? 'article')} ») a échoué/annulé. Statut passé en <strong>disputed</strong> : à traiter manuellement (rembourser l'acheteur ou renvoyer). Aucun virement automatique.</p>`)
        }
      }
    } catch (err) {
      console.error(`ubn-tracking : suivi order ${order.id} échoué :`, err.message)
      errors++
    }
    await sleep(300) // politesse : ne pas marteler ubn-speed.fr
  }

  const summary = `ubn-tracking terminé — ${checked} vérifiée(s), ${delivered} livrée(s), ${failed} échec(s), ${errors} erreur(s).`
  console.log(summary)
  return { statusCode: 200, body: summary }
}
