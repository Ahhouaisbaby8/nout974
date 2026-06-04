const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

exports.handler = async (event) => {
  const sig  = event.headers['stripe-signature']
  const body = event.body

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return { statusCode: 400, body: 'Signature webhook invalide.' }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session   = stripeEvent.data.object
    const { orderId, listingId } = session.metadata ?? {}

    if (orderId) {
      await supabase.from('orders').update({
        status:            'paid',
        stripe_payment_id: session.payment_intent,
      }).eq('id', orderId)
    }

    if (listingId) {
      await supabase.from('listings').update({ is_sold: true }).eq('id', listingId)
    }
  }

  if (stripeEvent.type === 'account.updated') {
    const account = stripeEvent.data.object
    if (account.charges_enabled) {
      await supabase.from('profiles')
        .update({ is_verified: true })
        .eq('stripe_account_id', account.id)
    }
  }

  return { statusCode: 200, body: 'OK' }
}
