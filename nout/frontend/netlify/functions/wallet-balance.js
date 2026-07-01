// SOLDE DU PORTE-MONNAIE VENDEUR — lit le solde réel du compte connecté Stripe (disponible + en attente)
// et le statut de vérification (KYC/IBAN). Sert à afficher « Mon argent » côté NOUT. Lecture seule.
//
// Le solde affiché par NOUT n'est qu'une VUE au-dessus du solde réellement détenu par Stripe (PSP agréé) :
// les fonds ne transitent jamais sous la garde de NOUT → conforme (pas d'activité d'établissement de paiement).
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

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

  // Auth JWT — l'appelant lit son PROPRE solde.
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
      // Pas encore de compte connecté : rien à afficher, la vérification n'a jamais été lancée.
      return { statusCode: 200, headers, body: JSON.stringify({
        activated: false, payoutsEnabled: false, detailsSubmitted: false, available: 0, pending: 0,
      }) }
    }

    const [account, balance] = await Promise.all([
      stripe.accounts.retrieve(accountId),
      stripe.balance.retrieve({ stripeAccount: accountId }),
    ])
    const available = (balance.available ?? []).find(b => b.currency === 'eur')?.amount ?? 0
    const pending   = (balance.pending ?? []).find(b => b.currency === 'eur')?.amount ?? 0

    return { statusCode: 200, headers, body: JSON.stringify({
      activated: true,
      payoutsEnabled:   !!account.payouts_enabled,   // KYC + IBAN validés → retrait possible
      detailsSubmitted: !!account.details_submitted,  // onboarding rempli (vérif éventuellement en cours)
      available: available / 100,
      pending:   pending / 100,
    }) }
  } catch (err) {
    console.error('[wallet-balance] erreur:', err?.message, err?.code ?? '')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Solde indisponible pour le moment.' }) }
  }
}
