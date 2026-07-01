// RETRAIT VENDEUR (« porte-monnaie ») — le vendeur vire vers SA banque le solde disponible de son
// compte connecté Stripe. Dans le modèle wallet, l'argent des ventes s'accumule dans le solde du compte
// connecté (versement réglé sur 'manual', cf. create-connect-account.js) et n'en sort QUE via ce endpoint.
//
// GARANTIES (argent) :
//  - On ne verse QUE le solde 'available' réel lu chez Stripe (jamais un montant fourni par le client).
//  - Deux retraits concurrents ne peuvent pas doublonner : le 2e dépasserait le solde et Stripe le rejette
//    (« insufficient available funds ») → au pire une erreur, jamais un double virement.
//  - On exige payouts_enabled (KYC + IBAN validés par Stripe) avant tout virement (obligation LCB-FT).
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Rate limiter en mémoire — 5 req/min par IP (garde anti double-clic / abus).
const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 5, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  // Auth JWT — l'appelant retire son PROPRE solde.
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', authUser.id)
      .single()

    const accountId = profile?.stripe_account_id
    if (!accountId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Active d\'abord tes paiements pour pouvoir retirer.', code: 'not_activated' }) }
    }

    // GEL DES RETRAITS en cas de litige bancaire en cours : si une des ventes du vendeur est en 'chargeback'
    // non résolu, on suspend les retraits. Les fonds contestés doivent rester dans le wallet (récupérables
    // par reversal côté webhook) ; sinon le vendeur pourrait retirer avant que NOUT ne récupère → NOUT perd.
    const { data: cbHold } = await supabase.from('orders')
      .select('id').eq('seller_id', authUser.id).eq('status', 'chargeback').limit(1)
    if (cbHold && cbHold.length) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Un litige de paiement est en cours sur une de tes ventes. Les retraits sont suspendus le temps de la résolution.', code: 'chargeback_hold' }) }
    }

    // Le compte doit pouvoir recevoir des virements (identité + IBAN validés par Stripe).
    const account = await stripe.accounts.retrieve(accountId)
    if (!account.payouts_enabled) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ton identité ou ton IBAN ne sont pas encore validés. Termine la vérification pour pouvoir retirer.', code: 'payouts_disabled' }) }
    }

    // Solde disponible du porte-monnaie (= solde du compte connecté). On ne verse QUE le 'available' réel.
    const balance = await stripe.balance.retrieve({ stripeAccount: accountId })
    const amount = (balance.available ?? []).find(b => b.currency === 'eur')?.amount ?? 0
    if (amount <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Aucun montant disponible au retrait pour le moment.', code: 'no_funds' }) }
    }

    // Virement du solde dispo vers la banque du vendeur.
    // Idempotence anti double-clic : clé = user + montant + fenêtre de 15 s. Deux clics rapprochés (même
    // fenêtre) rejouent la même clé → un seul virement. Un vrai retrait ultérieur (même montant, plus tard)
    // tombe dans une autre fenêtre → un nouveau virement est bien créé. La sécurité anti double-virement
    // ultime reste le solde Stripe : un 2e virement dépassant le solde est rejeté par Stripe.
    const idemWindow = Math.floor(Date.now() / 15_000)
    const payout = await stripe.payouts.create(
      { amount, currency: 'eur', metadata: { user_id: authUser.id } },
      { stripeAccount: accountId, idempotencyKey: `payout_${authUser.id}_${amount}_${idemWindow}` },
    )

    console.log(`[request-payout] ${amount / 100} € → ${accountId} (user ${authUser.id})`)
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, amount: amount / 100, arrivalDate: payout.arrival_date }) }
  } catch (err) {
    console.error('[request-payout] erreur:', err?.message, err?.code ?? '')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Le retrait n\'a pas pu être effectué à l\'instant. Réessaie dans un moment.' }) }
  }
}
