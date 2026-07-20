// ─── Suivi de colis Chronopost (cron) ────────────────────────────────────────────
//
// Interroge Chronopost (trackSkybillV2) pour les commandes 'shipped' expédiées via
// Chronopost. Quand le colis est livré (code événement 'D' = « Livraison effectuée »),
// on passe la commande en 'delivered' + delivered_at = now().
//
// ⚠️ CE MODULE NE VERSE PAS L'ARGENT. Il pose seulement delivered_at. C'est le cron
// PAIEMENT (auto-refund.js, autre PC) qui libère le versement au vendeur APRÈS la
// fenêtre de protection acheteur (48h). Séparation stricte logistique / argent.
//
// Statuts : paid → shipped → delivered → (48h) → completed.
//
// Lancé par un cron Netlify (comme auto-refund). Auth : header x-nout-cron = CRON_SECRET.
// Idempotent : ne repasse à 'delivered' que depuis 'shipped' (jamais écraser
// completed/disputed/refunded). En test/non configuré → ne fait rien proprement.

const { createClient } = require('@supabase/supabase-js')
const {
  soapCall, buildTags, isChronopostConfigured, xmlAll, xmlFirst, ChronopostError,
} = require('./_chronopost-client')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SITE_URL = process.env.URL || 'https://nout.re'

// Codes événements Chronopost signifiant « livré » (doc §4.1). D = livraison effectuée ;
// D1/D2/D6/D7 = variantes (boîte, pas de porte, QR, PIN) ; RG/RI = remis (gardien / au relais).
// DC = colis remis en point relais / consigne (code réellement renvoyé par le contrat Relais DOM
//      974 : constaté sur un vrai colis reçu par le client, code XF522939473FR le 18/07). Sans lui,
//      les livraisons en point relais restaient bloquées en 'shipped' → paiement vendeur jamais versé.
const DELIVERED_CODES = new Set(['D', 'D1', 'D2', 'D6', 'D7', 'DC', 'RG', 'RI', 'U', 'Y'])

// Interroge le suivi d'un colis. Renvoie le dernier code événement, ou null si indisponible.
async function fetchLastEvent(trackingNumber) {
  const inner = buildTags({ language: 'fr_FR', skybillNumber: trackingNumber })
  const xml = await soapCall('tracking', 'trackSkybillV2', inner)
  // Chaque <events> a un <code> et <highPriority> ; le dernier de la liste est highPriority=true.
  const events = xmlAll(xml, 'events').map((e) => ({
    code: xmlFirst(e, 'code'),
    high: xmlFirst(e, 'highPriority') === 'true',
    date: xmlFirst(e, 'eventDate'),
  }))
  if (!events.length) return null
  // On retient l'événement « courant » (highPriority) sinon le dernier lu.
  const current = events.find((e) => e.high) || events[events.length - 1]
  return current
}

exports.handler = async (event) => {
  // Auth cron (invocation planifiée Netlify = pas de httpMethod ; appel HTTP direct = secret requis)
  if (event.httpMethod) {
    const secret = process.env.CRON_SECRET
    if (!secret || event.headers['x-nout-cron'] !== secret) {
      return { statusCode: 401, body: 'Non autorisé.' }
    }
  }

  console.log('📦 chronopost-tracking démarré', new Date().toISOString())

  if (!isChronopostConfigured()) {
    console.log('Chronopost non configuré — rien à suivre.')
    return { statusCode: 200, body: 'Chronopost non configuré.' }
  }

  // Commandes expédiées via Chronopost, pas encore livrées, avec un numéro de suivi.
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, buyer_id, chronopost_tracking_number, tracking_number, chronopost_status, listing:listings!listing_id(title)')
    .eq('status', 'shipped')
    .eq('carrier', 'chronopost')

  if (error) {
    console.error('chronopost-tracking : lecture orders échouée :', error.message)
    return { statusCode: 500, body: 'Erreur lecture base.' }
  }
  if (!orders || orders.length === 0) {
    return { statusCode: 200, body: 'Aucune commande Chronopost à suivre.' }
  }

  let delivered = 0, checked = 0, errors = 0

  for (const order of orders) {
    const tracking = order.chronopost_tracking_number || order.tracking_number
    if (!tracking) continue
    checked++
    try {
      const last = await fetchLastEvent(tracking)
      if (!last || !last.code) continue

      // Mémorise le dernier statut connu (best-effort, pour l'affichage/diagnostic).
      if (last.code !== order.chronopost_status) {
        await supabase.from('orders').update({ chronopost_status: last.code }).eq('id', order.id)
      }

      if (!DELIVERED_CODES.has(last.code)) continue

      // ── LIVRÉ ── : shipped → delivered + delivered_at. Transition atomique (rowcount).
      // On ne verse RIEN ici : le cron paiement libère après la fenêtre de 48h.
      const deliveredAt = last.date ? new Date(last.date).toISOString() : new Date().toISOString()
      const { data: updated, error: updErr } = await supabase
        .from('orders')
        .update({ status: 'delivered', delivered_at: deliveredAt })
        .eq('id', order.id)
        .eq('status', 'shipped') // jamais écraser disputed/completed/refunded
        .select('id')
      if (updErr) {
        console.error(`chronopost-tracking : update delivered (order ${order.id}) :`, updErr.message)
        errors++
        continue
      }
      if (!updated || !updated.length) continue // déjà bougé par un autre passage

      delivered++
      console.log(`✅ Order ${order.id} livrée (event ${last.code}) → delivered_at ${deliveredAt}`)

      // Notifie l'acheteur (best-effort).
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
        }).catch((e) => console.error('chronopost-tracking send-push:', e.message))
      }
    } catch (err) {
      const msg = err instanceof ChronopostError ? `${err.code} ${err.message}` : err.message
      console.error(`chronopost-tracking : suivi order ${order.id} échoué :`, msg)
      errors++
    }
  }

  const summary = `chronopost-tracking terminé — ${checked} vérifiée(s), ${delivered} livrée(s), ${errors} erreur(s).`
  console.log(summary)
  return { statusCode: 200, body: summary }
}
