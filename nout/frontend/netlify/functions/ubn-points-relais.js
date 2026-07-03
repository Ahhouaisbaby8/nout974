// ─── Proxy : liste des points relais UBN ─────────────────────────────────────────
// Le checkout appelle CETTE fonction (jamais UBN directement) pour afficher le
// sélecteur de point relais. On ne crée JAMAIS de liste relais locale : on relaie
// /distant/points-relais et on renvoie items / select_options / map_markers au front.
//
// Lecture seule, pas de données sensibles → endpoint public (mais rate-limité).

const { ubnGet, isUbnConfigured, UbnError } = require('./_ubn-client')

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Rate limiter mémoire — 30 req/min par IP (suffisant pour un sélecteur)
const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 30, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'GET')     return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de requêtes. Réessaie dans une minute.' }) }
  }

  // Si UBN n'est pas encore configuré (clé non fournie), on renvoie une liste vide
  // proprement plutôt qu'une erreur → le front masque simplement l'option UBN relais.
  if (!isUbnConfigured()) {
    return { statusCode: 200, headers, body: JSON.stringify({ configured: false, items: [], select_options: [], map_markers: [] }) }
  }

  try {
    // Optionnel : filtrer par ville / CP si le HUB le supporte (paramètres passés tels quels)
    const query = {}
    if (event.queryStringParameters?.ville) query.ville = event.queryStringParameters.ville
    if (event.queryStringParameters?.cp)    query.cp    = event.queryStringParameters.cp

    const data = await ubnGet('/points-relais', { query })
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        configured: true,
        items:          data.items          ?? [],
        select_options: data.select_options ?? [],
        map_markers:    data.map_markers    ?? [],
        select_contract: data.select_contract ?? { value_field: 'ubn_pr_user_id' },
      }),
    }
  } catch (err) {
    const status = err instanceof UbnError ? err.status : 502
    console.error('ubn-points-relais error:', err.code || '', err.message)
    // [diag temporaire] code/message EXACT d'UBN pour distinguer invalid_api_key vs source_site_blocked. À RETIRER.
    return { statusCode: status, headers, body: JSON.stringify({ error: 'Impossible de récupérer les points relais UBN.', _diag: { code: err.code || null, message: err.message || null, status: err.status || null } }) }
  }
}
