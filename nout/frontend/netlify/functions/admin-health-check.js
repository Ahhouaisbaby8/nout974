// ─── VEILLE SANTÉ NOUT (cron d'alerte admin) ─────────────────────────────────────────────────
// Tourne 1×/jour. Détecte les situations importantes à surveiller et envoie UN SEUL mail récap
// à l'admin (contact@nout.re) s'il y a quelque chose à regarder. Ne MODIFIE rien, ne touche pas
// à l'argent : lecture seule + un email. But : ne plus jamais découvrir un souci par hasard
// (ex. le vendeur Evin bloqué qu'on a dû détecter parce qu'il a écrit).
//
// Surveille :
//  1) VENDEUR BLOQUÉ  : commande 'delivered' depuis > 3 j, jamais versée (status jamais passé completed).
//  2) COMPTE MORT      : commande settled dont le vendeur n'a PAS de stripe_account_id (ne peut être payé).
//  3) COLIS COINCÉ     : commande 'shipped' depuis > 10 j, jamais livrée (colis perdu / suivi bloqué).
//
// Auth : invocation planifiée Netlify (pas de httpMethod) OU header x-nout-cron = CRON_SECRET.

const { createClient } = require('@supabase/supabase-js')
const { cronAuthorized } = require('./_cron-auth')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SITE_URL = process.env.URL || 'https://nout.re'
const ADMIN_EMAIL = 'contact@nout.re'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) { console.warn('[health-check] RESEND_API_KEY absente — pas d\'email'); return }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NOUT <contact@nout.re>', to, subject, html }),
    })
    if (!res.ok) console.error(`[health-check] Resend ${res.status}:`, await res.text())
  } catch (err) {
    console.error('[health-check] email error:', err.message)
  }
}

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

exports.handler = async (event) => {
  if (!cronAuthorized(event)) return { statusCode: 401, body: 'Non autorisé.' }

  console.log('🩺 admin-health-check démarré', new Date().toISOString())

  const sections = []  // chaque entrée = { titre, lignes: [] }

  // ── 1) VENDEURS BLOQUÉS : livré depuis > 3 j, toujours pas versé (status delivered/payout_pending) ──
  try {
    const { data: rows } = await supabase
      .from('orders')
      .select('id, status, delivered_at, total_price, seller:profiles!seller_id(username, email, stripe_account_id), listing:listings!listing_id(title)')
      .in('status', ['delivered', 'payout_pending'])
      .lt('delivered_at', daysAgo(3))
      .order('delivered_at', { ascending: true })
    if (rows?.length) {
      sections.push({
        titre: `💸 ${rows.length} vendeur(s) en attente de paiement (livré depuis > 3 jours)`,
        lignes: rows.map(o =>
          `${esc(o.seller?.username || o.seller?.email || '?')} — « ${esc(o.listing?.title || 'article')} » ${o.total_price} € · statut ${o.status}${o.seller?.stripe_account_id ? '' : ' · ⚠️ PAS de compte de paiement'} · commande ${String(o.id).slice(0, 8)}`),
      })
    }
  } catch (e) { console.error('[health-check] 1 vendeurs bloqués:', e.message) }

  // ── 2) COMPTES MORTS : commande settled + vendeur sans stripe_account_id (ne peut pas recevoir) ──
  try {
    const { data: rows } = await supabase
      .from('orders')
      .select('id, status, seller:profiles!seller_id(username, email, stripe_account_id)')
      .in('status', ['paid', 'shipped', 'delivered', 'payout_pending'])
    const sansCompte = (rows || []).filter(o => o.seller && !o.seller.stripe_account_id)
    if (sansCompte.length) {
      // dédoublonne par vendeur
      const vus = new Set()
      const lignes = []
      for (const o of sansCompte) {
        const key = o.seller.email
        if (vus.has(key)) continue
        vus.add(key)
        lignes.push(`${esc(o.seller.username || o.seller.email)} n'a pas activé ses paiements (identité + IBAN) → son argent ne peut pas partir`)
      }
      sections.push({ titre: `🏦 ${lignes.length} vendeur(s) sans compte de paiement activé`, lignes })
    }
  } catch (e) { console.error('[health-check] 2 comptes morts:', e.message) }

  // ── 3) COLIS COINCÉS : expédié depuis > 10 j, jamais livré ──
  try {
    const { data: rows } = await supabase
      .from('orders')
      .select('id, carrier, tracking_number, shipped_at, listing:listings!listing_id(title)')
      .eq('status', 'shipped')
      .lt('shipped_at', daysAgo(10))
      .order('shipped_at', { ascending: true })
    if (rows?.length) {
      sections.push({
        titre: `📦 ${rows.length} colis expédié(s) depuis > 10 jours, jamais marqué(s) livré(s)`,
        lignes: rows.map(o =>
          `« ${esc(o.listing?.title || 'article')} » · ${esc(o.carrier || 'transporteur')} ${esc(o.tracking_number || '')} · commande ${String(o.id).slice(0, 8)}`),
      })
    }
  } catch (e) { console.error('[health-check] 3 colis coincés:', e.message) }

  // ── Rien à signaler → pas d'email (on ne spamme pas). ──
  if (sections.length === 0) {
    console.log('🩺 admin-health-check : rien à signaler.')
    return { statusCode: 200, body: 'RAS' }
  }

  // ── Construit et envoie le mail récap. ──
  const total = sections.reduce((n, s) => n + s.lignes.length, 0)
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;color:#1A1A2E">
      <h1 style="color:#0A0F2C;font-size:20px">🩺 Veille NOUT — ${total} point(s) à regarder</h1>
      <p style="color:#6B7A99;font-size:13px">Récap automatique du ${new Date().toLocaleDateString('fr-FR')}. Rien d'urgent n'est fait automatiquement — à toi de vérifier ce qui compte.</p>
      ${sections.map(s => `
        <div style="margin-top:20px">
          <h2 style="font-size:15px;color:#0E7FAB;border-left:4px solid #00C4B4;padding-left:10px">${esc(s.titre)}</h2>
          <ul style="font-size:13.5px;line-height:1.7;color:#333">
            ${s.lignes.map(l => `<li>${l}</li>`).join('')}
          </ul>
        </div>`).join('')}
      <p style="text-align:center;margin-top:28px">
        <a href="${SITE_URL}/admin" style="background:#0E7FAB;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">Ouvrir l'admin NOUT</a>
      </p>
      <p style="color:#B4BED2;font-size:11px;margin-top:20px">Tu reçois ce mail car il y a au moins un point à surveiller. S'il n'y a rien, aucun mail n'est envoyé.</p>
    </div>`

  await sendEmail(ADMIN_EMAIL, `🩺 Veille NOUT — ${total} point(s) à regarder`, html)
  console.log(`🩺 admin-health-check : ${total} point(s) signalé(s) → mail envoyé à ${ADMIN_EMAIL}.`)
  return { statusCode: 200, body: `Alerte envoyée (${total}).` }
}
