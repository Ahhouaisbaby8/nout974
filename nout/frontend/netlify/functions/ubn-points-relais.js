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

// ── Géocodage des points relais ────────────────────────────────────────────────────
// UBN ne renvoie pas toujours lat/lng (souvent null). Pour la carte façon Vinted, on géocode
// l'adresse via OpenStreetMap / Nominatim (GRATUIT, sans clé). Cache mémoire : le set de relais 974
// est petit et stable → quasi aucun appel après réchauffement du lambda. Politique Nominatim respectée
// (User-Agent obligatoire, usage léger grâce au cache). Repli propre : si une adresse ne se géocode pas,
// le point reste sans coords (affiché dans la liste, pas de marqueur sur la carte).
const _geoCache = new Map()   // adresse normalisée -> {lat,lng} | null

function geocodeAddress(address) {
  const key = address.trim().toLowerCase()
  if (_geoCache.has(key)) return _geoCache.get(key)
  // On met en cache la PROMESSE (pas seulement le résultat) → deux relais d'une même commune lancés
  // en parallèle (Promise.all) partagent le MÊME appel Nominatim au lieu d'en faire deux. Anti-burst.
  const promise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 2500)
      const res = await fetch(url, {
        headers: { 'User-Agent': 'NOUT-marketplace/1.0 (contact@nout.re)', 'Accept-Language': 'fr' },
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        const arr = await res.json()
        const hit = Array.isArray(arr) ? arr[0] : null
        if (hit && hit.lat && hit.lon) return { lat: Number(hit.lat), lng: Number(hit.lon) }
      }
    } catch { /* timeout / réseau → repli sans coords */ }
    return null
  })()
  _geoCache.set(key, promise)
  return promise
}

async function enrichWithCoords(items) {
  // Pré-init : chaque item a lat/lng DÉFINI (null par défaut) AVANT tout géocodage. Ainsi, même si le
  // budget-temps global ci-dessous coupe le géocodage, la réponse reste complète et valide.
  items.forEach((it) => {
    const rawLat = it.lat ?? it.latitude
    const rawLng = it.lng ?? it.longitude
    it.lat = (rawLat != null && rawLat !== '') ? Number(rawLat) : null
    it.lng = (rawLng != null && rawLng !== '') ? Number(rawLng) : null
  })

  const geocodeAll = Promise.all(items.map(async (it) => {
    if (it.lat != null && it.lng != null) return
    const street = it.address  || it.ubn_pr_address  || ''
    const cp     = it.postcode || it.cp || it.ubn_pr_postcode || ''
    const city   = it.city     || it.ubn_pr_city     || ''
    // Du plus précis au plus large : rue → CP+ville → ville. OSM connaît mal les rues de La Réunion
    // (la rue exacte renvoie souvent []), le repli CP/commune donne au moins la bonne zone. Les requêtes
    // CP+ville sont PARTAGÉES entre relais d'une même commune → le cache-promesse mutualise l'appel.
    const candidates = [
      street && `${street}, ${cp} ${city}, La Réunion, France`,
      (cp || city) && `${[cp, city].filter(Boolean).join(' ')}, La Réunion, France`,
      city && `${city}, La Réunion, France`,
    ].filter(Boolean)
    for (const q of candidates) {
      const c = await geocodeAddress(q)
      if (c) { it.lat = c.lat; it.lng = c.lng; break }
    }
  }))

  // BUDGET-TEMPS GLOBAL : on ne bloque JAMAIS la réponse plus de ~5s pour le géocodage. Si Nominatim
  // pendouille, ce plafond évite de dépasser le timeout Netlify (10s) et de perdre TOUTE la liste relais.
  // Au-delà, on renvoie les items tels quels (coords déjà trouvées gardées, le reste à null → liste OK).
  await Promise.race([geocodeAll, new Promise((resolve) => setTimeout(resolve, 5000))])
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
    const items = Array.isArray(data.items) ? data.items : []
    await enrichWithCoords(items)   // ajoute lat/lng (géocodage OSM + cache) pour la carte
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        configured: true,
        items,
        select_options: data.select_options ?? [],
        map_markers:    data.map_markers    ?? [],
        select_contract: data.select_contract ?? { value_field: 'ubn_pr_user_id' },
      }),
    }
  } catch (err) {
    const status = err instanceof UbnError ? err.status : 502
    console.error('ubn-points-relais error:', err.code || '', err.message)
    return { statusCode: status, headers, body: JSON.stringify({ error: 'Impossible de récupérer les points relais UBN.' }) }
  }
}
