// ─── VERSEMENT ADMIN À LA DEMANDE ────────────────────────────────────────────────────────────
// Bouton admin « Verser les paiements en attente ». Parcourt les commandes livrées dont le délai
// de protection acheteur est écoulé et déclenche le versement au vendeur via releaseSellerPayout
// (MÊME logique idempotente et sûre que le cron release-delivered — jamais de double-paiement).
//
// Sert de FILET quand le cron planifié ne s'exécute pas côté Netlify : l'admin peut verser d'un clic.
// Réservé aux admins (JWT + rôle 'admin'). Ne verse QUE le solde dû réel, ne touche à rien d'autre.

const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')
const { releaseSellerPayout } = require('./_payout')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const CORS_ORIGIN = process.env.URL || 'https://nout.re'
const RECEIPT_WINDOW_HOURS = 48   // même fenêtre que release-delivered

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Auth admin (JWT + rôle), comme admin-actions.js.
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
  if (callerProfile?.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs.' }) }
  }

  // Commandes livrées, délai de protection écoulé (mêmes critères que le cron).
  const cutoff = new Date(Date.now() - RECEIPT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, status, delivered_at, seller_id, buyer_id, total_price, seller_payout, stripe_payment_id,
      listing:listings!listing_id(title, price),
      seller:profiles!seller_id(email, username, stripe_account_id)
    `)
    .eq('status', 'delivered')
    .lt('delivered_at', cutoff)

  if (error) {
    console.error('[admin-release-payouts] lecture orders:', error.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lecture base.' }) }
  }
  if (!orders?.length) {
    return { statusCode: 200, headers, body: JSON.stringify({ released: 0, message: 'Aucun paiement en attente à verser.' }) }
  }

  let released = 0, skipped = 0, errors = 0
  const details = []

  for (const order of orders) {
    try {
      // Anti-versé-pendant-litige (même garde que le cron) : si le paiement est contesté, on suspend.
      if (order.stripe_payment_id) {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_id, { expand: ['latest_charge'] })
        if (pi?.latest_charge && typeof pi.latest_charge === 'object' && pi.latest_charge.disputed) {
          skipped++; details.push(`${order.seller?.username || '?'} : paiement contesté → suspendu`); continue
        }
      }
      const res = await releaseSellerPayout({ stripe, supabase, order })
      if (res.outcome === 'settled' && res.transferOk) {
        const compte = order.seller?.stripe_account_id ? ` (compte ${String(order.seller.stripe_account_id).slice(0, 12)}…)` : ''
        released++; details.push(`${order.seller?.username || order.seller?.email} : ${res.payoutNet} € versés${compte} ✅`)
      } else if (res.outcome === 'retry') {
        skipped++; details.push(`${order.seller?.username || '?'} : à réessayer (transfert non abouti)`)
      } else {
        skipped++; details.push(`${order.seller?.username || '?'} : déjà versé`)
      }
    } catch (e) {
      errors++; console.error(`[admin-release-payouts] order ${order.id}:`, e.message)
      details.push(`${order.seller?.username || '?'} : erreur (${e.message})`)
    }
  }

  console.log(`[admin-release-payouts] ${released} versé(s), ${skipped} ignoré(s), ${errors} erreur(s).`)
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ released, skipped, errors, details }),
  }
}
