// SESSION DE COMPTE pour l'onboarding Stripe EMBARQUÉ (composant affiché DANS NOUT, sans redirection).
// Crée le compte connecté au besoin (particulier, versement manuel = porte-monnaie), puis renvoie un
// client_secret que le composant <ConnectAccountOnboarding> consomme côté front.
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

  // Auth JWT — l'appelant onboarde son PROPRE compte.
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email')
      .eq('id', authUser.id)
      .single()

    let accountId = profile?.stripe_account_id

    // Auto-réparation : ID stocké mais compte inexistant côté Stripe → on repart de zéro.
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId)
      } catch (e) {
        if (e?.code === 'resource_missing' || e?.statusCode === 404) {
          accountId = null
          await supabase.from('profiles').update({ stripe_account_id: null }).eq('id', authUser.id)
        } else {
          throw e
        }
      }
    }

    // Créer le compte connecté si besoin (PARTICULIER, sans SIRET ; versement MANUEL = porte-monnaie).
    if (!accountId) {
      const account = await stripe.accounts.create({
        type:          'express',
        country:       'FR',
        email:         profile?.email,
        business_type: 'individual',
        capabilities:  { transfers: { requested: true } },
        business_profile: { product_description: 'Vente d\'articles de seconde main sur NOUT 974' },
        settings:      { payouts: { schedule: { interval: 'manual' } } },
      })
      accountId = account.id
      await supabase.from('profiles').update({ stripe_account_id: accountId }).eq('id', authUser.id)
    }

    // Session pour le composant embarqué d'onboarding.
    const accountSession = await stripe.accountSessions.create({
      account:    accountId,
      components: { account_onboarding: { enabled: true } },
    })

    // On renvoie AUSSI la clé publique Stripe si elle est configurée côté serveur (STRIPE_PUBLIC_KEY),
    // pour que le front réutilise la config existante SANS avoir besoin d'une variable VITE_ dédiée.
    const publishableKey = process.env.STRIPE_PUBLIC_KEY || process.env.VITE_STRIPE_PUBLIC_KEY || null
    return { statusCode: 200, headers, body: JSON.stringify({ clientSecret: accountSession.client_secret, publishableKey }) }
  } catch (err) {
    console.error('[create-account-session] erreur:', err?.message, err?.code ?? '')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Impossible de préparer la vérification pour le moment.' }) }
  }
}
