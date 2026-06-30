const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Rate limiter en mémoire — 5 req/min par IP
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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Rate limiting
  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  // Vérification JWT — l'appelant doit être authentifié
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  }

  try {
    const { userId } = JSON.parse(event.body)
    const siteUrl    = process.env.URL || 'http://localhost:8888'

    // L'utilisateur authentifié doit être celui qui active le compte
    if (authUser.id !== userId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email')
      .eq('id', userId)
      .single()

    let accountId = profile?.stripe_account_id

    // Créer le compte Connect Express si pas encore fait
    if (!accountId) {
      const account = await stripe.accounts.create({
        type:          'express',
        country:       'FR',
        email:         profile?.email,
        business_type: 'individual',   // PARTICULIER → pas de SIRET (le SIRET n'est demandé que pour 'company')
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Vente d\'articles de seconde main sur NOUT 974',
        },
      })
      accountId = account.id
      await supabase.from('profiles').update({ stripe_account_id: accountId }).eq('id', userId)
    }

    // Générer le lien d'onboarding
    const link = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${siteUrl}/parametres?stripe=refresh`,
      return_url:  `${siteUrl}/parametres?stripe=success`,
      type:        'account_onboarding',
    })

    return { statusCode: 200, headers, body: JSON.stringify({ url: link.url }) }

  } catch (err) {
    console.error('Connect error:', err.message)
    // DEBUG TEMPORAIRE : on renvoie le vrai message Stripe pour diagnostiquer (à retirer ensuite).
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Impossible de créer le compte vendeur. [Stripe: ${err.message}]` }) }
  }
}
