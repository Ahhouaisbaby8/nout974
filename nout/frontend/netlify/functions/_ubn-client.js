// ─── Client HUB UBN — helper serveur partagé (jamais exposé au navigateur) ───────
//
// Centralise les appels à l'API UBN (« API Distant », doc v4.5) avec
// l'authentification et la signature HMAC requises. La clé API et les identifiants
// vivent UNIQUEMENT en variables d'environnement Netlify — jamais dans le code,
// jamais renvoyés au front.
//
// Variables d'environnement attendues (à définir dans Netlify, voir .env.example) :
//   UBN_API_KEY       clé secrète fournie par UBN (X-UBN-API-KEY)
//   UBN_HUB_BASE      URL de base du HUB (ex : https://hub.ubn-...re)  — SANS slash final
//   UBN_PARTNER       nom partenaire (X-UBN-Partner)
//   UBN_CUSTOMER      id client API (X-UBN-Customer)
//   UBN_API_CONNECT_ID  id_api_connect (numérique) à mettre dans les payloads
//   UBN_SOURCE_SITE   URL du site source (défaut: process.env.URL || https://nout.re)
//
// Tant que UBN_API_KEY / UBN_HUB_BASE ne sont pas définies, isUbnConfigured() = false
// et les endpoints renvoient proprement « UBN non configuré » → AUCUN impact site live.

const crypto = require('crypto')

const cfg = () => ({
  apiKey:    process.env.UBN_API_KEY || '',
  hubBase:   (process.env.UBN_HUB_BASE || '').replace(/\/+$/, ''),
  partner:   process.env.UBN_PARTNER || '',
  customer:  process.env.UBN_CUSTOMER || '',
  connectId: process.env.UBN_API_CONNECT_ID || '',
  sourceSite: process.env.UBN_SOURCE_SITE || process.env.URL || 'https://nout.re',
})

// L'intégration est-elle prête à être utilisée ? (clé + URL du HUB présentes)
const isUbnConfigured = () => {
  const { apiKey, hubBase } = cfg()
  return Boolean(apiKey && hubBase)
}

const API_PREFIX = '/wp-json/ubn-api-hub-re/v1/distant'

// Headers d'identité communs à toutes les requêtes authentifiées
const baseHeaders = () => {
  const c = cfg()
  return {
    'X-UBN-API-KEY':     c.apiKey,
    'X-UBN-Partner':     c.partner,
    'X-UBN-Customer':    c.customer,
    'X-UBN-Source-Site': c.sourceSite,
  }
}

// Construit l'URL complète d'un endpoint distant
const url = (path, query) => {
  const c = cfg()
  const u = new URL(c.hubBase + API_PREFIX + path)
  if (query) for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v))
  }
  return u.toString()
}

// ── GET authentifié ──
async function ubnGet(path, { query, accept = 'application/json' } = {}) {
  if (!isUbnConfigured()) throw new UbnError('ubn_not_configured', 503, 'UBN non configuré.')
  const res = await fetch(url(path, query), {
    method: 'GET',
    headers: { ...baseHeaders(), 'Accept': accept },
  })
  return parseResponse(res, accept)
}

// ── POST signé HMAC ──
// Signature : HMAC_SHA256(timestamp + "." + body_json_brut, cle_api)
// On signe EXACTEMENT la chaîne JSON envoyée (bodyRaw), pas un re-stringify.
async function ubnPost(path, payload) {
  if (!isUbnConfigured()) throw new UbnError('ubn_not_configured', 503, 'UBN non configuré.')
  const c = cfg()
  const bodyRaw   = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const sign = crypto
    .createHmac('sha256', c.apiKey)
    .update(timestamp + '.' + bodyRaw)
    .digest('hex')

  const res = await fetch(url(path), {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Content-Type':    'application/json',
      'Accept':          'application/json',
      'X-UBN-Timestamp': timestamp,
      'X-UBN-Sign':      sign,
    },
    body: bodyRaw,
  })
  return parseResponse(res, 'application/json')
}

// Lit la réponse selon le type attendu, lève une UbnError lisible sur échec
async function parseResponse(res, accept) {
  const ctype = res.headers.get('content-type') || ''

  // Binaire (bordereau PDF/ZIP)
  if (accept.includes('pdf') || accept.includes('zip')) {
    if (res.ok && (ctype.includes('pdf') || ctype.includes('zip'))) {
      const buf = Buffer.from(await res.arrayBuffer())
      return { binary: buf, contentType: ctype }
    }
    // Sinon, le HUB renvoie un JSON d'erreur (ex: tracking_pending)
    const j = await safeJson(res)
    throw new UbnError(j.code || 'bordereau_error', res.status, j.message || 'Bordereau indisponible.')
  }

  const json = await safeJson(res)
  if (!res.ok) {
    throw new UbnError(json.code || `http_${res.status}`, res.status, json.message || 'Erreur UBN.')
  }
  return json
}

async function safeJson(res) {
  try { return await res.json() } catch { return {} }
}

// Erreur typée pour remonter proprement code + statut HTTP aux endpoints
class UbnError extends Error {
  constructor(code, status, message) {
    super(message)
    this.name = 'UbnError'
    this.code = code
    this.status = status || 502
  }
}

module.exports = { ubnGet, ubnPost, isUbnConfigured, UbnError, cfg, API_PREFIX }
