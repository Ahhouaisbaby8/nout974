// ─── Téléchargement du bordereau (étiquette) UBN ─────────────────────────────────
//
// Proxy serveur (doc v4.5, page 5) : le navigateur n'appelle jamais UBN avec la clé.
// Cette fonction vérifie que l'appelant est bien le VENDEUR de la commande, puis
// récupère le bordereau auprès du HUB via ref_commande et le renvoie (PDF/ZIP).
//
// Le bordereau est un document logistique pour le vendeur/préparateur (pas l'acheteur).

const { createClient } = require('@supabase/supabase-js')
const { ubnGet, isUbnConfigured, UbnError } = require('./_ubn-client')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 20, windowMs = 60_000, now = Date.now()
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'GET')     return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers: jsonHeaders, body: JSON.stringify({ error: 'Trop de requêtes. Réessaie dans une minute.' }) }
  }

  if (!isUbnConfigured()) {
    return { statusCode: 503, headers: jsonHeaders, body: JSON.stringify({ error: 'La livraison UBN n\'est pas encore activée.' }) }
  }

  // JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const orderId = event.queryStringParameters?.order_id
    if (!orderId) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Commande manquante.' }) }
    }

    // Vérifier que l'appelant est le vendeur, récupérer les identifiants UBN de la commande.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, seller_id, ubn_ref_commande, ubn_tracking_number, tracking_number')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ error: 'Commande introuvable.' }) }
    }
    if (order.seller_id !== authUser.id) {
      return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }
    if (!order.ubn_ref_commande) {
      return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ error: 'Aucune expédition UBN pour cette commande.' }) }
    }

    // Le HUB indexe le bordereau côté « receiver » (UBN FR). Diagnostic terrain (17/07) :
    // l'appel par NOTRE ref_commande (NOUT-<id>) renvoie `receiver_lookup_failed` alors que le
    // colis EXISTE — le récepteur le retrouve par le NUMÉRO DE SUIVI (USR….-RE, l'« ID » imprimé
    // sur l'étiquette), pas par notre ref. On tente donc les deux clés : ref d'abord (documentée),
    // suivi en secours. La première qui renvoie un PDF/ZIP gagne.
    const lookupKeys = [...new Set([
      order.ubn_ref_commande,
      order.ubn_tracking_number,
      order.tracking_number,
    ].filter(Boolean))]

    let result = null
    let lastErr = null
    for (const key of lookupKeys) {
      try {
        result = await ubnGet('/bordereau', {
          query: { ref_commande: key },
          accept: 'application/pdf, application/zip, application/json',
        })
        break
      } catch (e) {
        lastErr = e
      }
    }
    if (!result) throw lastErr

    const isPdf = result.contentType.includes('pdf')
    const ext   = isPdf ? 'pdf' : 'zip'
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="bordereau-${order.ubn_ref_commande}.${ext}"`,
      },
      body: result.binary.toString('base64'),
      isBase64Encoded: true,
    }

  } catch (err) {
    if (err instanceof UbnError) {
      // [diag] TEMPORAIRE : on remonte la réponse EXACTE d'UBN (statut + code + message) pour
      // diagnostiquer pourquoi le bordereau ne sort pas. À REMETTRE en message propre après.
      const diag = `[diag] UBN ${err.status} · ${err.code || 'sans-code'} · ${String(err.message || '').slice(0, 200)}`
      return { statusCode: err.status, headers: jsonHeaders, body: JSON.stringify({ error: diag, code: err.code }) }
    }
    console.error('ubn-bordereau error:', err.message)
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Erreur serveur.' }) }
  }
}
