const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { randomInt } = require('crypto')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Rate limiter en mémoire — 10 req/min par IP
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
    const { listingId, buyerId } = JSON.parse(event.body)

    // L'utilisateur authentifié doit être le buyer déclaré
    if (authUser.id !== buyerId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    // Récupérer l'annonce (plus besoin du stripe_account_id vendeur)
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, profiles(id, email)')
      .eq('id', listingId)
      .single()

    if (error || !listing) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Annonce introuvable.' }) }
    }

    // Un vendeur ne peut pas acheter sa propre annonce
    if (listing.user_id === buyerId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tu ne peux pas acheter ta propre annonce.' }) }
    }

    if (listing.is_sold) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cet article a déjà été vendu.' }) }
    }

    if (listing.is_active === false) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette annonce n\'est plus disponible.' }) }
    }

    // Vérification anti double-paiement — ignore les commandes pending > 1h (paiement abandonné)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('listing_id', listingId)
      .not('status', 'in', '("cancelled","refunded")')
      .or(`status.neq.pending,created_at.gte.${oneHourAgo}`)
      .maybeSingle()

    if (existingOrder) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cet article est déjà en cours d\'achat.' }) }
    }

    const prixArticle    = listing.price
    const fraisFixe      = 1.00
    const fraisVariable  = prixArticle * 0.05
    const totalFraisNout = fraisFixe + fraisVariable
    const totalAcheteur  = prixArticle + totalFraisNout

    const amountCents = Math.round(totalAcheteur * 100)
    const siteUrl     = process.env.URL || 'http://localhost:8888'

    // Créer la commande en base
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      buyer_id:        buyerId,
      seller_id:       listing.user_id,
      listing_id:      listingId,
      total_price:     totalAcheteur,
      shipping_method: 'hand',
      status:          'pending',
    }).select().single()

    if (orderError || !order) {
      console.error('Order insert error:', orderError?.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la création de la commande.' }) }
    }

    // Générer le code escrow à 6 chiffres et le stocker AVANT la session Stripe
    // (si Stripe échoue ensuite, la commande reste pending et le code expire naturellement)
    const escrowCode = String(randomInt(100000, 1000000))
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: escrowError } = await supabase.from('escrow_codes').insert({
      order_id:   order.id,
      code:       escrowCode,
      expires_at: expiresAt,
    })

    if (escrowError) {
      console.error('Escrow insert error:', escrowError.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la création du code de remise.' }) }
    }

    // Créer la session Stripe Checkout — argent capturé sur le compte NOUT, pas de transfert vendeur
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name:   listing.title,
            images: listing.images?.slice(0, 1) ?? [],
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        // Pas de transfer_data ni application_fee_amount : l'argent reste sur le compte Stripe NOUT.
        // Le transfert au vendeur sera déclenché manuellement à la confirmation du code escrow.
        metadata: { orderId: order.id, listingId },
      },
      metadata: { orderId: order.id, listingId },
      success_url: `${siteUrl}/paiement-succes?commande=${order.id}`,
      cancel_url:  `${siteUrl}/annonce/${listingId}`,
    })

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) }

  } catch (err) {
    console.error('Stripe error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors du paiement. Réessaie.' }) }
  }
}
