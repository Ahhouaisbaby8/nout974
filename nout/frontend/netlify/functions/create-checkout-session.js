const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const COMMISSION = 0.10 // 10 % pour NOUT

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  try {
    const { listingId, buyerId } = JSON.parse(event.body)

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

    const amount     = Math.round(listing.price * 100) // en centimes
    const appFee     = Math.round(amount * COMMISSION)
    const siteUrl    = process.env.URL || 'http://localhost:8888'

    // Créer la commande en base
    const { data: order } = await supabase.from('orders').insert({
      buyer_id:        buyerId,
      seller_id:       listing.user_id,
      listing_id:      listingId,
      total_price:     listing.price,
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
          unit_amount: amount,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: appFee,
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
