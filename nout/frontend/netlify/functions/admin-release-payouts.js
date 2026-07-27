// ─── VERSEMENT ADMIN À LA DEMANDE (liste + sélection) ────────────────────────────────────────
// L'admin VOIT les vendeurs en attente de versement et CHOISIT qui payer (case à cocher). Filet quand
// le cron release-delivered ne s'exécute pas côté Netlify.
//
// 2 modes (champ `mode` du body) :
//   'list' (défaut) → renvoie la liste des commandes à verser (aucun mouvement d'argent). Lecture seule.
//   'pay'           → verse UNIQUEMENT les orderIds fournis (cochés par l'admin), via releaseSellerPayout
//                     (idempotent : jamais de double-paiement). On ne verse QUE ce qui est éligible.
//
// Réservé admin (JWT + rôle 'admin'). Ne verse que le solde dû réel figé sur chaque commande.

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

// Charge les commandes éligibles au versement (livrées + délai de protection écoulé).
async function loadEligible() {
  const cutoff = new Date(Date.now() - RECEIPT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, delivered_at, seller_id, buyer_id, total_price, seller_payout, stripe_payment_id,
      listing:listings!listing_id(title, price),
      seller:profiles!seller_id(email, username, stripe_account_id)
    `)
    .eq('status', 'delivered')
    .lt('delivered_at', cutoff)
    .order('delivered_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Auth admin (JWT + rôle).
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
  if (callerProfile?.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs.' }) }
  }

  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch { /* défaut = list */ }
  const mode = body.mode === 'pay' ? 'pay' : 'list'

  let eligible
  try { eligible = await loadEligible() }
  catch (e) {
    console.error('[admin-release-payouts] lecture:', e.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lecture base.' }) }
  }

  // ── MODE LISTE : on montre tout, on ne verse rien. ──
  if (mode === 'list') {
    const now = Date.now()
    const items = eligible.map((o) => {
      const jours = o.delivered_at ? Math.floor((now - new Date(o.delivered_at).getTime()) / 86400000) : null
      return {
        orderId: o.id,
        vendeur: o.seller?.username || o.seller?.email || 'Vendeur inconnu',
        email: o.seller?.email || '',
        article: o.listing?.title || 'Article',
        montant: o.seller_payout != null ? Number(o.seller_payout) : null,
        compte: o.seller?.stripe_account_id || null,   // null = compte non activé (argent bloqué)
        livreLe: o.delivered_at,
        joursDepuisLivraison: jours,
      }
    })
    return { statusCode: 200, headers, body: JSON.stringify({ items }) }
  }

  // ── MODE PAIEMENT : on verse UNIQUEMENT les orderIds cochés. ──
  const wanted = Array.isArray(body.orderIds) ? new Set(body.orderIds.map(String)) : null
  if (!wanted || wanted.size === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Aucun paiement sélectionné.' }) }
  }
  const toPay = eligible.filter((o) => wanted.has(String(o.id)))

  let released = 0, skipped = 0, errors = 0
  const details = []
  for (const order of toPay) {
    try {
      // Anti-versé-pendant-litige : si le paiement est contesté, on suspend.
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

  console.log(`[admin-release-payouts] pay : ${released} versé(s), ${skipped} ignoré(s), ${errors} erreur(s).`)
  return { statusCode: 200, headers, body: JSON.stringify({ released, skipped, errors, details }) }
}
