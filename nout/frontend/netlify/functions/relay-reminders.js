// ─── RELANCES « va retirer ton colis » (point relais) ────────────────────────────────────────
// Un colis peut rester 10-14 j au point relais avant retrait. Tant qu'il n'est PAS retiré, le vendeur
// n'est pas payé et l'acheteur n'est pas remboursé (l'argent dort en sécurité) — mais on veut POUSSER
// l'acheteur à aller le chercher, sans rien imposer d'infaisable (c'est le transporteur qui garde le colis).
//
// Déclenché par cron-logistics (toutes les 15 min), APRÈS le suivi transporteur (qui pose package_stage
// = 'at_relay' + package_stage_at = date d'arrivée au relais). Ce module relance l'acheteur à 2 paliers :
//   - J+3 après l'arrivée au relais  → 1er rappel
//   - J+7 après l'arrivée au relais  → 2e rappel (plus insistant)
// Anti-doublon : orders.relay_reminder_sent mémorise le dernier palier envoyé (0 / 3 / 7) → jamais de spam.
//
// N'EFFECTUE AUCUN MOUVEMENT D'ARGENT. Envoie juste un email + une notif push. Sûr par construction.

const { createClient } = require('@supabase/supabase-js')
const { recordHeartbeat } = require('./_heartbeat')

const SITE_URL = process.env.URL || 'https://nout.re'
const REMINDER_DAYS = [7, 3]   // paliers, du plus ancien au plus récent (on traite le plus haut atteint)
const PICKUP_WINDOW_DAYS = 10  // fenêtre de retrait affichée à l'acheteur (marge sous la limite transporteur 10-14 j)

let _supabase = null
const getSupabase = () => {
  if (_supabase) return _supabase
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('Config Supabase absente')
  _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NOUT <contact@nout.re>', to, subject, html }),
    })
  } catch (err) { console.error('[relay-reminders] email:', err.message) }
}

const sendPush = async (buyerId, title, body) => {
  if (!buyerId || !process.env.CRON_SECRET) return
  try {
    await fetch(`${SITE_URL}/.netlify/functions/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
      body: JSON.stringify({ receiver_id: buyerId, title, body, url: '/commandes?tab=achats' }),
    })
  } catch (err) { console.error('[relay-reminders] push:', err.message) }
}

// Combien de jours reste-t-il pour retirer, à partir de l'arrivée au relais. Toujours ≥ 0.
const daysLeftToPickup = (stageAt) => {
  const elapsed = Math.floor((Date.now() - new Date(stageAt).getTime()) / 86400000)
  return Math.max(0, PICKUP_WINDOW_DAYS - elapsed)
}

const emailHtml = (order, joursRestants) => `
  <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
    <h1 style="color:#0E7FAB;font-size:20px">Ton colis t'attend au point relais 📦</h1>
    <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
      « ${escHtml(order.listing?.title ?? 'Ton article')} » est arrivé à ton point relais et t'attend.
      Pense à aller le retirer${joursRestants > 0 ? ` : il te reste environ <strong>${joursRestants} jour${joursRestants > 1 ? 's' : ''}</strong> avant qu'il ne soit renvoyé à l'expéditeur.` : '.'}
    </p>
    <p style="color:#6b7280;font-size:13px;line-height:1.6">
      Munis-toi d'une pièce d'identité. Sans retrait dans les délais, le colis repart chez le vendeur et ta commande est remboursée.
    </p>
    <p style="text-align:center;margin-top:24px">
      <a href="${SITE_URL}/commandes?tab=achats" style="background:#0E7FAB;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">Voir ma commande</a>
    </p>
  </div>`

exports.handler = async (event) => {
  // Autorisé comme les autres crons : appel planifié (cron-logistics, sans httpMethod) OU clé externe.
  const isScheduled = !event?.httpMethod
  const key = event?.queryStringParameters?.key || event?.headers?.['x-payout-key']
  if (!isScheduled && (!process.env.PAYOUT_CRON_KEY || key !== process.env.PAYOUT_CRON_KEY)) {
    return { statusCode: 403, body: 'Non autorisé.' }
  }

  console.log('📮 relay-reminders démarré', new Date().toISOString())

  let supabase
  try { supabase = getSupabase() }
  catch (e) { console.error('[relay-reminders] config :', e.message); return { statusCode: 500, body: e.message } }

  // Colis actuellement AU RELAIS (pas encore retiré/livré), avec une date d'arrivée connue.
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`id, buyer_id, package_stage, package_stage_at, relay_reminder_sent,
             listing:listings!listing_id(title),
             buyer:profiles!buyer_id(email, username)`)
    .eq('status', 'shipped')
    .eq('package_stage', 'at_relay')
    .not('package_stage_at', 'is', null)

  if (error) {
    console.error('[relay-reminders] lecture orders :', error.message)
    return { statusCode: 500, body: 'Erreur lecture base.' }
  }
  if (!orders?.length) {
    await recordHeartbeat(supabase, 'relay-reminders', 'RAS — aucun colis en attente de retrait.')
    return { statusCode: 200, body: 'RAS — aucun colis en attente de retrait.' }
  }

  let sent = 0, skipped = 0, errors = 0
  for (const order of orders) {
    try {
      const daysAtRelay = Math.floor((Date.now() - new Date(order.package_stage_at).getTime()) / 86400000)
      const already = order.relay_reminder_sent ?? 0
      // Palier atteint le plus élevé (7 puis 3) qui n'a pas déjà été envoyé.
      const due = REMINDER_DAYS.find(d => daysAtRelay >= d && already < d)
      if (!due) { skipped++; continue }

      const joursRestants = daysLeftToPickup(order.package_stage_at)
      await sendEmail(
        order.buyer?.email,
        due >= 7 ? 'Dernier rappel : retire ton colis au point relais' : 'Ton colis t\'attend au point relais',
        emailHtml(order, joursRestants),
      )
      await sendPush(
        order.buyer_id,
        'Colis à retirer — NOUT 974',
        `${order.listing?.title ?? 'Ton colis'} t'attend au point relais${joursRestants > 0 ? ` (encore ${joursRestants} j)` : ''}.`,
      )
      // Mémorise le palier (anti-spam) — atomique, ne réécrit pas si un autre passage a déjà avancé le palier.
      await supabase.from('orders').update({ relay_reminder_sent: due }).eq('id', order.id).lt('relay_reminder_sent', due)
      sent++
      console.log(`📮 [relay-reminders] order ${order.id} → relance J+${due} (au relais depuis ${daysAtRelay} j).`)
    } catch (err) {
      console.error(`[relay-reminders] order ${order.id} :`, err.message); errors++
    }
  }

  const summary = `relay-reminders terminé — ${sent} relance(s), ${skipped} déjà à jour, ${errors} erreur(s).`
  console.log(summary)
  await recordHeartbeat(supabase, 'relay-reminders', summary)
  return { statusCode: 200, body: summary }
}
