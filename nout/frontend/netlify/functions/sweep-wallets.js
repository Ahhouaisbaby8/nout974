// GARDE-FOU 90 JOURS (porte-monnaie) — Stripe ne conserve PAS indéfiniment les fonds dans le solde d'un
// compte connecté : pour la France, la rétention max est d'environ 90 jours. Sans garde-fou, un vendeur qui
// ne retire jamais verrait Stripe finir par bloquer/vider son solde de façon subie. Ce cron force donc le
// virement des fonds DORMANTS avant l'échéance. Marge de sécurité : on balaie à 75 jours (15 j de coussin).
//
// Aucun calcul de commission ici : on ne fait que virer vers le vendeur le solde qui est DÉJÀ le sien.
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const SWEEP_AFTER_DAYS = 75
const DAY_MS = 24 * 60 * 60 * 1000

exports.handler = async () => {
  const now = Date.now()
  let checked = 0, swept = 0, errors = 0

  // Tous les vendeurs avec un compte connecté. Volume faible au lancement ; à paginer si ça grandit.
  const { data: sellers, error } = await supabase
    .from('profiles')
    .select('id, stripe_account_id')
    .not('stripe_account_id', 'is', null)
    .limit(1000)

  if (error) {
    console.error('[sweep-wallets] lecture profiles :', error.message)
    return { statusCode: 500, body: 'Erreur lecture vendeurs.' }
  }

  // Vendeurs avec un litige bancaire en cours → on NE balaie PAS (fonds gelés le temps de la résolution,
  // cohérent avec le gel des retraits de request-payout.js).
  const { data: cbOrders } = await supabase.from('orders').select('seller_id').eq('status', 'chargeback')
  const frozenSellers = new Set((cbOrders ?? []).map((o) => o.seller_id))

  for (const s of (sellers ?? [])) {
    const acct = s.stripe_account_id
    if (frozenSellers.has(s.id)) continue
    try {
      const account = await stripe.accounts.retrieve(acct)
      if (!account.payouts_enabled) continue   // KYC/IBAN incomplet : impossible de virer, rien à balayer.

      const balance = await stripe.balance.retrieve({ stripeAccount: acct })
      const amount = (balance.available ?? []).find(b => b.currency === 'eur')?.amount ?? 0
      if (amount <= 0) continue
      checked++

      // Âge des fonds ≈ temps depuis le DERNIER virement (dans notre modèle on retire toujours TOUT le
      // solde dispo → après un payout, solde = 0), à défaut depuis la création du compte. Proxy conservateur :
      // au pire on vire un peu trop tôt (sans conséquence), jamais trop tard.
      const lastPayout = await stripe.payouts.list({ limit: 1 }, { stripeAccount: acct })
      const refTs = (lastPayout.data[0]?.created ?? account.created) * 1000
      const ageDays = (now - refTs) / DAY_MS
      if (ageDays < SWEEP_AFTER_DAYS) continue

      // Fonds dormants trop vieux : virement forcé AVANT l'échéance Stripe. Idempotent par jour.
      await stripe.payouts.create(
        { amount, currency: 'eur', metadata: { forced_sweep: 'true', user_id: s.id } },
        { stripeAccount: acct, idempotencyKey: `sweep_${acct}_${Math.floor(now / DAY_MS)}` },
      )
      swept++
      console.log(`[sweep-wallets] virement forcé ${amount / 100} € (compte ${acct}, fonds ~${Math.round(ageDays)} j)`)
    } catch (e) {
      console.error(`[sweep-wallets] compte ${acct} :`, e?.message)
      errors++
    }
  }

  const summary = `sweep-wallets terminé — ${checked} avec solde, ${swept} virement(s) forcé(s), ${errors} erreur(s).`
  console.log(summary)
  return { statusCode: 200, body: summary }
}
