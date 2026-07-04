const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'
const SITE_URL       = process.env.URL || 'https://nout.re'

const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 10, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  // Vérification JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { order_id, tracking_number } = JSON.parse(event.body ?? '{}')

    if (!order_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'order_id manquant.' }) }
    }

    const cleaned = (tracking_number ?? '').trim()
    if (!cleaned) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Le numéro de suivi est obligatoire.' }) }
    }
    if (cleaned.length > 100) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Numéro de suivi trop long (100 caractères max).' }) }
    }

    // Récupérer la commande pour vérifier le vendeur et le statut
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, seller_id, buyer_id, listing:listings!listing_id(title)')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }
    }

    // Seul le vendeur de cette commande peut la marquer comme expédiée
    if (order.seller_id !== authUser.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    // Seule une commande au statut "paid" peut passer à "shipped"
    if (order.status !== 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Statut de commande incompatible : "${order.status}". Seules les commandes "paid" peuvent être expédiées.` }),
      }
    }

    // Mise à jour atomique : tracking_number + shipped_at + status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status:          'shipped',
        tracking_number: cleaned,
        shipped_at:      new Date().toISOString(),
      })
      .eq('id', order_id)
      .eq('status', 'paid') // garde idempotente : évite d'écraser un statut déjà mis à jour

    if (updateError) {
      console.error('[update-order-shipping] update error:', updateError.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la mise à jour de la commande.' }) }
    }

    // Le code escrow expire 7 j après le PAIEMENT. Pour une livraison, ce délai peut tomber AVANT
    // l'arrivée du colis (Chronopost lent) → la confirmation deviendrait impossible et l'argent
    // resterait bloqué (ni versé, ni remboursé). On prolonge donc le code à expédition + 10 jours
    // (transit + marge de confirmation). On ne touche jamais un code déjà confirmé ou remboursé.
    const escrowExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const { error: escrowExtendError } = await supabase
      .from('escrow_codes')
      .update({ expires_at: escrowExpiry })
      .eq('order_id', order_id)
      .is('confirmed_at', null)
      .is('refunded_at', null)
    if (escrowExtendError) {
      console.error('[update-order-shipping] escrow extend error:', escrowExtendError.message)
    }

    // Notification push à l'acheteur — best-effort
    if (order.buyer_id) {
      fetch(`${SITE_URL}/.netlify/functions/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
        body: JSON.stringify({
          receiver_id: order.buyer_id,
          title:       '📦 Ton colis est en route — NOUT 974',
          body:        `${order.listing?.title ?? 'Ton article'} a été expédié par notre service de livraison.`,
          url:         '/commandes?tab=achats',
        }),
      }).catch(err => console.error('[update-order-shipping] send-push:', err.message))
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error('[update-order-shipping] error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) }
  }
}
