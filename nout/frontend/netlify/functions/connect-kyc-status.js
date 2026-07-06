// STATUT DE VÉRIFICATION VENDEUR — lit l'état KYC du compte connecté Stripe de l'appelant pour
// piloter le parcours « Vérifier mon identité » DANS NOUT (onboarding par API, zéro page Stripe).
// Lecture seule, aucun mouvement d'argent. Renvoie aussi la clé PUBLIQUE Stripe (publishable, non
// secrète par définition) pour que le front tokenise identité/IBAN directement chez Stripe (PSD2).
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { buildKycSnapshot, EMPTY_SNAPSHOT } = require('./_kyc')
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

  // Anti-flooding : max 20 lectures de statut KYC/min par IP (appelle Stripe → coûteux si bombardé)
  if (rateLimit(getClientIp(event), 'connect-kyc-status', 20)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
  }

  // Auth JWT — l'appelant lit son PROPRE statut (jamais de userId en body).
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  // Clé publique Stripe (pk_…) : nécessaire au front pour créer les tokens. C'est une clé
  // PUBLIQUE (elle vit déjà dans le bundle des sites qui utilisent Stripe.js), pas un secret.
  const publishableKey = process.env.STRIPE_PUBLIC_KEY || process.env.VITE_STRIPE_PUBLIC_KEY || null

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', authUser.id)
      .single()

    const accountId = profile?.stripe_account_id
    if (!accountId) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...EMPTY_SNAPSHOT, publishableKey }) }
    }

    let account
    try {
      account = await stripe.accounts.retrieve(accountId)
    } catch (e) {
      // ID périmé/étranger : le parcours repartira de zéro (même philosophie d'auto-réparation
      // que create-connect-account) — on ne bloque pas le vendeur sur un ID mort.
      if (e?.code === 'resource_missing' || e?.statusCode === 404) {
        return { statusCode: 200, headers, body: JSON.stringify({ ...EMPTY_SNAPSHOT, publishableKey }) }
      }
      console.error('[connect-kyc-status] accounts.retrieve:', e?.message, e?.code)
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Lecture du compte de paiement impossible pour le moment. Réessaie.' }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ...buildKycSnapshot(account), publishableKey }) }
  } catch (err) {
    console.error('[connect-kyc-status] erreur:', err?.message, err?.code ?? '')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Statut indisponible pour le moment.' }) }
  }
}
