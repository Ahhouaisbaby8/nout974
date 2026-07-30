// ─── REMBOURSEMENT ADMIN À LA DEMANDE (une commande précise) ─────────────────────────────────
// L'admin rembourse une commande coincée (ex. colis expédié jamais livré) EN UN CLIC, et voit le
// résultat/l'erreur À L'ÉCRAN (plus besoin de fouiller les logs Netlify). Rembourse une commande
// 'paid' ou 'shipped' NON livrée. Garde-fous : jamais si déjà remboursée, déjà livrée, ou versée au
// vendeur. Idempotent (idempotencyKey Stripe). Réservé admin (JWT + rôle).

const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')
const { computeRefundAmount } = require('./_fees')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const CORS_ORIGIN = process.env.URL || 'https://nout.re'
const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
  if (prof?.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs.' }) }

  let orderId = ''
  try { orderId = (JSON.parse(event.body || '{}').orderId || '').trim() } catch { /* */ }
  if (!orderId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'orderId manquant.' }) }

  try {
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('id, status, delivered_at, stripe_payment_id, total_price, seller_payout, shipping_fee, listing_id, buyer:profiles!buyer_id(email, username), listing:listings!listing_id(title)')
      .eq('id', orderId).single()
    if (oErr || !order) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }

    // Garde-fous clairs (message renvoyé à l'écran).
    if (order.delivered_at) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette commande est marquée LIVRÉE — remboursement bloqué (vérifie avant).' }) }
    if (!['paid', 'shipped'].includes(order.status)) return { statusCode: 400, headers, body: JSON.stringify({ error: `Statut « ${order.status} » : rien à rembourser (déjà remboursée/annulée/terminée ?).` }) }
    if (!order.stripe_payment_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Pas de paiement Stripe rattaché à cette commande.' }) }

    // Anti-double : si un transfert vendeur existe déjà, on NE rembourse pas (litige à traiter à part).
    try {
      const tr = await stripe.transfers.list({ transfer_group: `order_${order.id}`, limit: 5 })
      if ((tr.data || []).some(t => (t.amount_reversed ?? 0) < t.amount)) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Le vendeur a déjà été payé pour cette commande — remboursement à traiter en litige (ne pas rembourser à l\'aveugle).' }) }
      }
    } catch (e) { /* si la liste échoue, on continue prudemment vers le refund idempotent */ }

    // Verrou escrow (best-effort) : marque refunded_at pour éviter un double via le cron.
    await supabase.from('escrow_codes').update({ refunded_at: new Date().toISOString() })
      .eq('order_id', order.id).is('refunded_at', null).is('confirmed_at', null)

    const refundInfo = computeRefundAmount(order)
    let refund
    try {
      refund = await stripe.refunds.create(
        { payment_intent: order.stripe_payment_id, ...(refundInfo.amountCents > 0 ? { amount: refundInfo.amountCents } : {}) },
        { idempotencyKey: `refund_${order.id}` },
      )
    } catch (stripeErr) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Stripe a refusé le remboursement : ${stripeErr.message}` }) }
    }

    // Commande → refunded + annonce remise en vente.
    await Promise.all([
      supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id).in('status', ['paid', 'shipped']),
      supabase.from('listings').update({ is_sold: false }).eq('id', order.listing_id),
    ])

    const montant = (refundInfo.amountCents / 100).toFixed(2)
    return { statusCode: 200, headers, body: JSON.stringify({
      success: true,
      message: `Remboursement effectué : ${montant} € rendus à ${order.buyer?.username ?? 'l\'acheteur'} (${order.listing?.title ?? ''}). Visible sous 5-10 j sur son relevé.`,
      montant, refundId: refund.id, refundStatus: refund.status,
    }) }
  } catch (e) {
    console.error('admin-refund-order:', e.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur : ' + e.message }) }
  }
}
