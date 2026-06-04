const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  try {
    const { userId } = JSON.parse(event.body)
    const siteUrl    = process.env.URL || 'http://localhost:8888'

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email')
      .eq('id', userId)
      .single()

    let accountId = profile?.stripe_account_id

    // Créer le compte Connect Express si pas encore fait
    if (!accountId) {
      const account = await stripe.accounts.create({
        type:    'express',
        country: 'FR',
        email:   profile?.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Vente d\'articles de seconde main sur NOUT 974',
        },
      })
      accountId = account.id
      await supabase.from('profiles').update({ stripe_account_id: accountId }).eq('id', userId)
    }

    // Générer le lien d'onboarding
    const link = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${siteUrl}/parametres?stripe=refresh`,
      return_url:  `${siteUrl}/parametres?stripe=success`,
      type:        'account_onboarding',
    })

    return { statusCode: 200, headers, body: JSON.stringify({ url: link.url }) }

  } catch (err) {
    console.error('Connect error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Impossible de créer le compte vendeur.' }) }
  }
}
