// SOLDE DU PORTE-MONNAIE VENDEUR — lit le solde réel du compte connecté Stripe (disponible + en attente)
// et le statut de vérification (KYC/IBAN). Sert à afficher « Mon argent » côté NOUT. Lecture seule.
//
// Le solde affiché par NOUT n'est qu'une VUE au-dessus du solde réellement détenu par Stripe (PSP agréé) :
// les fonds ne transitent jamais sous la garde de NOUT → conforme (pas d'activité d'établissement de paiement).
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { rateLimit, getClientIp, TOO_MANY } = require('./_rate-limit')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Anti-flooding : max 20 lectures de solde/min par IP (appelle Stripe → coûteux si bombardé)
  if (rateLimit(getClientIp(event), 'wallet-balance', 20)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
  }

  // Auth JWT — l'appelant lit son PROPRE solde.
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, is_verified')
      .eq('id', authUser.id)
      .single()

    const accountId = profile?.stripe_account_id
    if (!accountId) {
      // Pas encore de compte connecté : rien à afficher, la vérification n'a jamais été lancée.
      return { statusCode: 200, headers, body: JSON.stringify({
        activated: false, payoutsEnabled: false, detailsSubmitted: false, available: 0, pending: 0, payouts: [],
      }) }
    }

    // 1) Statut du compte (KYC / versements). Si CETTE lecture échoue, c'est le vrai problème → on remonte
    //    la raison exacte pour diagnostiquer au lieu d'un message générique.
    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
    } catch (e) {
      console.error('[wallet-balance] accounts.retrieve:', e?.message, e?.code)
      // Message générique côté client (le détail Stripe reste dans les logs serveur uniquement).
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Lecture du compte de paiement impossible pour le moment. Réessaie.' }) }
    }

    // 2) Solde du porte-monnaie. Un compte tout neuf peut ne pas encore exposer de solde : dans ce cas on
    //    NE plante PAS toute la page — on affiche 0 € et on garde le statut du compte lu à l'étape 1.
    let available = 0, pending = 0
    try {
      // Le compte connecté se passe en OPTION (2e arg → entête Stripe-Account), PAS en paramètre de
      // requête : sinon Stripe renvoie 400 « unknown parameter: stripeAccount » et le solde retombe à 0.
      const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId })
      available = (balance.available ?? []).find(b => b.currency === 'eur')?.amount ?? 0
      pending   = (balance.pending ?? []).find(b => b.currency === 'eur')?.amount ?? 0
    } catch (e) {
      console.error('[wallet-balance] balance.retrieve:', e?.message, e?.code)
    }

    // 3) Historique des virements (versements du porte-monnaie vers la banque du vendeur). Lecture seule,
    //    sert uniquement à l'affichage « virement en route / derniers retraits » côté NOUT — le vendeur
    //    n'a pas de tableau de bord Stripe (compte dashboard 'none'), donc c'est ici qu'il voit son argent
    //    bouger. On ne renvoie que des champs d'affichage (montant, statut, dates), aucune donnée sensible.
    let payouts = []
    try {
      const list = await stripe.payouts.list({ limit: 6 }, { stripeAccount: accountId })
      payouts = (list.data ?? []).map(p => ({
        amount:      (p.amount ?? 0) / 100,
        status:      p.status,        // paid | in_transit | pending | canceled | failed
        arrivalDate: p.arrival_date,  // timestamp Unix (secondes)
        created:     p.created,
      }))
    } catch (e) {
      console.error('[wallet-balance] payouts.list:', e?.message, e?.code)
    }

    // Self-heal du drapeau public `is_verified` (affiché ailleurs, ex. Espace Vendeur) : il DOIT suivre
    // payouts_enabled. Les comptes 'transfers-only' n'ont jamais charges_enabled → le webhook ne le posait
    // pas → l'Espace Vendeur affichait « Active tes paiements » alors que le compte est actif. On le
    // rattrape ici dès que Stripe confirme payouts_enabled (écriture idempotente, service_role).
    if (account.payouts_enabled && !profile?.is_verified) {
      const { error: healErr } = await supabase.from('profiles').update({ is_verified: true }).eq('id', authUser.id)
      if (healErr) console.error('[wallet-balance] backfill is_verified:', healErr.message)
    }

    return { statusCode: 200, headers, body: JSON.stringify({
      activated: true,
      payoutsEnabled:   !!account.payouts_enabled,   // KYC + IBAN validés → retrait possible
      detailsSubmitted: !!account.details_submitted,  // onboarding rempli (vérif éventuellement en cours)
      available: available / 100,
      pending:   pending / 100,
      payouts,
    }) }
  } catch (err) {
    console.error('[wallet-balance] erreur:', err?.message, err?.code ?? '')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Solde indisponible pour le moment.' }) }
  }
}
