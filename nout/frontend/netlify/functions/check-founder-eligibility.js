'use strict'

const { createClient } = require('@supabase/supabase-js')
const { checkAndAssignFounder } = require('./_founder-check')
const { rateLimit, getClientIp, TOO_MANY } = require('./_rate-limit')

// Client service_role pour valider le JWT entrant
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

/**
 * POST /.netlify/functions/check-founder-eligibility
 * Authorization: Bearer <user_jwt>
 *
 * Appelé :
 *   - Côté client, après chaque publication d'annonce (CreateListing.jsx)
 *   - Côté serveur, depuis confirm-escrow.js après chaque transaction terminée
 *
 * Répond toujours 200 avec { eligible, assigned, reason? }
 * Les erreurs internes sont loggées sans exposer de détails au client.
 */
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Anti-flooding : max 20 vérifications/min par IP (requêtes DB répétées)
  if (rateLimit(getClientIp(event), 'check-founder-eligibility', 20)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
  }

  // Vérification JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '')
    .replace('Bearer ', '').trim()
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  }

  try {
    const result = await checkAndAssignFounder(authUser.id)
    return { statusCode: 200, headers, body: JSON.stringify(result) }
  } catch (err) {
    console.error('[check-founder-eligibility]', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) }
  }
}
