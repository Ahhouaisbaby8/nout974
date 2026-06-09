const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://effortless-tapioca-c6ab25.netlify.app'

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

    // Récupérer l'annonce + le compte Stripe du vendeur
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, profiles(id, stripe_account_id, email)')
      .eq('id', listingId)
      .single()

    if (error || !listing) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Annonce introuvable.' }) }
    }
    if (listing.is_sold) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cet article a déjà été vendu.' }) }
    }
    if (!listing.profiles?.stripe_account_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Le vendeur n'a pas encore activé les paiements. Contacte-le directement." }) }
    }

    const prixArticle    = listing.price
    const fraisFixe      = 1.00
    const fraisVariable  = prixArticle * 0.05
    const totalFraisNout = fraisFixe + fraisVariable
    const totalAcheteur  = prixArticle + totalFraisNout

    const amountCents  = Math.round(totalAcheteur * 100)
    const appFeeCents  = Math.round(totalFraisNout * 100)
    const siteUrl      = process.env.URL || 'http://localhost:8888'

    // Créer la commande en base
    const { data: order } = await supabase.from('orders').insert({
      buyer_id:        buyerId,
      seller_id:       listing.user_id,
      listing_id:      listingId,
      total_price:     totalAcheteur,
      shipping_method: 'hand',
      status:          'pending',
    }).select().single()

    // Créer la session Stripe Checkout
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
        application_fee_amount: appFeeCents,
        transfer_data: { destination: listing.profiles.stripe_account_id },
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
