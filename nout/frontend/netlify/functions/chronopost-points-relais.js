// ─── Proxy : liste des points relais Chronopost ──────────────────────────────────
// Le checkout appelle CETTE fonction (jamais Chronopost directement) pour afficher
// le sélecteur de point relais. On relaie recherchePointChronopostInter et on
// renvoie une liste normalisée (nom, adresse, horaires, idRelais, distance).
//
// Lecture seule, pas de données sensibles → endpoint public (mais rate-limité).
//
// Paramètres GET : ?cp=97400&ville=SAINT%20DENIS  (facultatif adresse=...)

const {
  soapCall, buildTags, credentials, isChronopostConfigured,
  xmlAll, xmlFirst, ChronopostError,
} = require('./_chronopost-client')

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

// Transforme un bloc <listePointRelais>...</listePointRelais> en objet propre pour le front.
function parseRelais(block) {
  const identifiant = xmlFirst(block, 'identifiant')
  if (!identifiant) return null
  // Horaires : concatène les jours renseignés (jour 1=lundi ... 7=dimanche)
  const horaires = xmlAll(block, 'listeHoraireOuverture')
    .map((h) => {
      const jour = xmlFirst(h, 'jour')
      const asStr = xmlFirst(h, 'horairesAsString')
      return jour && asStr ? { jour: Number(jour), horaires: asStr } : null
    })
    .filter(Boolean)
    // dédoublonne (le bloc parent partage le même nom de balise que les enfants)
    .filter((v, i, arr) => arr.findIndex((x) => x.jour === v.jour) === i)
    .sort((a, b) => a.jour - b.jour)

  return {
    id:         identifiant,                          // = idRelais pour l'étiquette
    nom:        xmlFirst(block, 'nom') || '',
    adresse:    xmlFirst(block, 'adresse1') || '',
    codePostal: xmlFirst(block, 'codePostal') || '',
    ville:      xmlFirst(block, 'localite') || '',
    latitude:   xmlFirst(block, 'coordGeolocalisationLatitude') || null,
    longitude:  xmlFirst(block, 'coordGeolocalisationLongitude') || null,
    distanceM:  Number(xmlFirst(block, 'distanceEnMetre') || 0),
    horaires,
  }
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

  // Non configuré → liste vide proprement (le front masque l'option Chrono relais).
  if (!isChronopostConfigured()) {
    return { statusCode: 200, headers, body: JSON.stringify({ configured: false, points: [] }) }
  }

  const q = event.queryStringParameters || {}
  const cp    = (q.cp || '').trim()
  const ville = (q.ville || '').trim()
  const adresse = (q.adresse || '').trim()

  if (!cp || !ville) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres cp et ville obligatoires.' }) }
  }

  try {
    const c = credentials('relais')
    // Date de dépôt = aujourd'hui au format JJ/MM/AAAA (exigé par le service)
    const now = new Date()
    const shippingDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    // Ordre des champs = celui de la doc §2.4.2.a1 (SOAP document : ordre important).
    const inner = buildTags({
      accountNumber:      c.account,
      password:           c.password,
      address:            adresse,
      zipCode:            cp,
      city:               ville,
      countryCode:        'RE',            // La Réunion
      type:               'P',             // Point relais + consigne
      productCode:        c.productCode,   // 4P
      service:            'L',             // livraison en point Chronopost
      weight:             1000,            // 1 kg indicatif (grammes)
      shippingDate,
      maxPointChronopost: 8,
      maxDistanceSearch:  15,
      holidayTolerant:    1,
      version:            '2.0',
    })

    const xml = await soapCall('pointrelais', 'recherchePointChronopostInter', inner)

    const points = xmlAll(xml, 'listePointRelais')
      .map(parseRelais)
      .filter(Boolean)
      // dédoublonne par identifiant (blocs imbriqués partagent le nom de balise)
      .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
      .sort((a, b) => a.distanceM - b.distanceM)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ configured: true, isTest: c.isTest, points }),
    }
  } catch (err) {
    const status = err instanceof ChronopostError ? err.status : 502
    console.error('chronopost-points-relais error:', err.code || '', err.message)
    return { statusCode: status, headers, body: JSON.stringify({ error: 'Impossible de récupérer les points relais Chronopost.' }) }
  }
}
