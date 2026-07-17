// ─── Callback de statut UBN (le HUB UBN appelle CE endpoint) — doc API Distant v4.6 §11-15 ───────────
//
// Contrairement au suivi Chronopost (qu'on interroge), UBN POUSSE les changements de statut :
// UBN FR → HUB RE → POST vers CE endpoint. On retrouve la commande (ref_commande = 'NOUT-<order_id>' ou
// tracking), et si le statut = « livré » on pose delivered + delivered_at. C'est ensuite release-delivered
// (cron, déjà en place) qui verse le vendeur 48h après, avec toutes les gardes anti-double-paiement.
//
// ── SÉCURITÉ / ARGENT ──
//  - Auth : le HUB envoie le secret status-sync (X-UBN-SECRET / X-UBN-KEY / X-UBN-API-KEY / Bearer) → on le
//    compare à UBN_STATUS_SYNC_SECRET (variable Netlify, jamais dans le code).
//  - Ce endpoint ne DÉPLACE AUCUN ARGENT : il ne fait que poser delivered_at. Le versement (release-delivered)
//    reste soumis à sa fenêtre 48h + check litige + gardes transfer_group. Idempotent (transition atomique).
//  - On répond toujours 200 sur une commande introuvable / statut non éligible (pas de retry en boucle UBN).

const { createClient } = require('@supabase/supabase-js')
const { rateLimit, getClientIp } = require('./_rate-limit')
// Libellés « livré/échec » + normalisation : SOURCE UNIQUE partagée avec le poll ubn-tracking.js.
const { norm, DELIVERED, FAILED } = require('./_ubn-status')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NOUT <contact@nout.re>', to, subject, html }),
    })
  } catch (e) { console.error('[ubn-status-sync] email:', e.message) }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  // Anti-flooding : max 60 callbacks/min par IP (le HUB UBN légitime reste bien en-dessous ;
  // borne les tentatives de brute-force du secret status-sync).
  if (rateLimit(getClientIp(event), 'ubn-status-sync', 60)) {
    return { statusCode: 429, body: 'Trop de requêtes.' }
  }

  // ── Auth : secret status-sync fourni par le HUB UBN (plusieurs en-têtes possibles, doc §14) ──
  const secret = process.env.UBN_STATUS_SYNC_SECRET
  if (!secret) return { statusCode: 503, body: 'status-sync non configuré.' }
  const h = event.headers || {}
  const bearer = String(h['authorization'] || h['Authorization'] || '').replace(/^Bearer\s+/i, '').trim()
  const provided = h['x-ubn-secret'] || h['x-ubn-key'] || h['x-ubn-api-key'] || bearer || ''
  if (provided !== secret) {
    console.warn('[ubn-status-sync] clé invalide')
    return { statusCode: 401, body: 'Clé status-sync invalide.' }
  }

  let payload
  try { payload = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, body: 'JSON invalide.' } }

  const status   = payload.status || payload.wpcargo_status || ''
  const ref      = String(payload.ref_commande || payload.reference_commande || '')
  const tracking = String(payload.tracking_number || payload.tracking || '')
  const nStatus  = norm(status)

  // ── Retrouver la commande (doc §15) : d'abord ref_commande = 'NOUT-<order_id>', sinon le tracking ──
  let order = null
  const m = ref.match(/^NOUT-(.+)$/)
  if (m) {
    const { data } = await supabase.from('orders').select('id, status').eq('id', m[1]).maybeSingle()
    order = data
  }
  if (!order && tracking) {
    const safeTracking = tracking.replace(/[^A-Za-z0-9._-]/g, '')  // anti-injection filtre PostgREST
    if (safeTracking) {
      const { data } = await supabase.from('orders').select('id, status')
        .or(`ubn_tracking_number.eq.${safeTracking},tracking_number.eq.${safeTracking}`).maybeSingle()
      order = data
    }
  }
  if (!order) {
    console.warn(`[ubn-status-sync] order_not_found (ref=${ref}, tracking=${tracking}, status=${status})`)
    return { statusCode: 200, body: JSON.stringify({ success: true, order_not_found: true }) }
  }

  // ── LIVRÉ → pose delivered + delivered_at (atomique depuis 'shipped'). release-delivered verse 48h après. ──
  if (DELIVERED.has(nStatus)) {
    const { data: moved } = await supabase.from('orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', order.id).eq('status', 'shipped').select('id')
    if (moved?.length) console.log(`[ubn-status-sync] order ${order.id} livré (${status}) → delivered`)
    return { statusCode: 200, body: JSON.stringify({ success: true, applied: 'delivered' }) }
  }

  // ── ÉCHEC / ANNULATION → gel en litige pour examen admin (AUCUN mouvement d'argent auto). ──
  if (FAILED.has(nStatus)) {
    const { data: frozen } = await supabase.from('orders')
      .update({ status: 'disputed' }).eq('id', order.id).eq('status', 'shipped').select('id')
    if (frozen?.length) {
      console.warn(`[ubn-status-sync] order ${order.id} échec livraison (${status}) → disputed`)
      await sendEmail('contact@nout.re', `Livraison UBN échouée — commande ${order.id}`,
        `<p>La livraison UBN de la commande <strong>${order.id}</strong> a échoué/annulé (« ${escHtml(status)} »). Statut passé en <strong>disputed</strong> : à traiter manuellement (rembourser l'acheteur ou renvoyer). Aucun virement automatique.</p>`)
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, applied: 'disputed' }) }
  }

  // ── En transit / non éligible → rien à faire (comme le "status_not_eligible" du HUB). ──
  return { statusCode: 200, body: JSON.stringify({ success: true, ignored: true, status }) }
}
