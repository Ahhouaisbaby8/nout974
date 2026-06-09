const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const escHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const SITE_URL = process.env.URL || 'https://effortless-tapioca-c6ab25.netlify.app'

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to,
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      console.error(`Resend error ${res.status} (destinataire: ${to}):`, errBody)
    } else {
      console.log(`Email envoyé OK à ${to}`)
    }
  } catch (err) {
    console.error('Email error:', err.message)
  }
}

exports.handler = async (event) => {
  console.log('🔔 WEBHOOK REÇU', event.httpMethod, new Date().toISOString())
  console.log('Headers reçus :', JSON.stringify(event.headers))

  const sig  = event.headers['stripe-signature']
  const body = event.body

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Signature webhook invalide :', err.message)
    return { statusCode: 400, body: 'Signature webhook invalide.' }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const { orderId, listingId } = session.metadata ?? {}

    // 1. Mettre la commande en statut "paid"
    if (orderId) {
      await supabase.from('orders').update({
        status:            'paid',
        stripe_payment_id: session.payment_intent,
      }).eq('id', orderId)
    }

    // 2. Marquer l'annonce comme vendue (la retire du catalogue)
    if (listingId) {
      await supabase.from('listings').update({ is_sold: true }).eq('id', listingId)
    }

    // 3. Emails de confirmation acheteur + vendeur
    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          total_price,
          buyer_id,
          seller_id,
          buyer:profiles!buyer_id(email, username),
          seller:profiles!seller_id(email, username),
          listing:listings!listing_id(title, price)
        `)
        .eq('id', orderId)
        .single()

      if (order) {
        const { buyer, seller, listing: annonce, total_price } = order

        // Email acheteur — confirmation d'achat
        if (buyer?.email) {
          await sendEmail(
            buyer.email,
            '✅ Confirmation de ton achat — NOUT 974',
            `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
                <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
                  <div style="text-align:center;margin-bottom:24px">
                    <span style="font-size:48px">✅</span>
                    <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Achat confirmé !</h1>
                    <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(buyer.username)}, ton paiement a bien été reçu.</p>
                  </div>

                  <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                    <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article acheté</p>
                    <p style="margin:0 0 4px;font-weight:bold;color:#1A1A2E;font-size:16px">${escHtml(annonce?.title ?? 'Article')}</p>
                    <p style="margin:0;font-size:24px;font-weight:800;color:#1A3A8F">${Number(total_price).toFixed(2)} €</p>
                  </div>

                  <p style="color:#1A1A2E;line-height:1.6">Le vendeur a été notifié et va te contacter via la messagerie NOUT pour organiser la remise en main propre.</p>

                  <div style="text-align:center;margin-top:28px">
                    <a href="${SITE_URL}/commandes"
                       style="display:inline-block;background:linear-gradient(135deg,#0E7FAB,#00C4B4);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">
                      Voir mes commandes
                    </a>
                  </div>

                  <p style="color:#6B7A99;font-size:12px;text-align:center;margin-top:32px;border-top:1px solid #E8F0FF;padding-top:16px">
                    L'équipe NOUT 974 — Le marketplace 100 % réunionnais 🌴
                  </p>
                </div>
              </div>
            `
          )
        }

        // Email vendeur — notification de vente
        if (seller?.email) {
          await sendEmail(
            seller.email,
            '🎉 Tu as fait une vente — NOUT 974',
            `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
                <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
                  <div style="text-align:center;margin-bottom:24px">
                    <span style="font-size:48px">🎉</span>
                    <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Félicitations !</h1>
                    <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(seller.username)}, tu viens de vendre un article !</p>
                  </div>

                  <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                    <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article vendu</p>
                    <p style="margin:0 0 4px;font-weight:bold;color:#1A1A2E;font-size:16px">${escHtml(annonce?.title ?? 'Ton article')}</p>
                    <p style="margin:0;font-size:24px;font-weight:800;color:#00C4B4">${Number(annonce?.price ?? 0).toFixed(2)} €</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#6B7A99">La commission NOUT est déduite automatiquement — le solde sera viré sur ton compte Stripe.</p>
                  </div>

                  <p style="color:#1A1A2E;line-height:1.6">L'acheteur va te contacter via la messagerie NOUT pour organiser la remise en main propre. Ton annonce a été automatiquement retirée du catalogue.</p>

                  <div style="text-align:center;margin-top:28px">
                    <a href="${SITE_URL}/messages"
                       style="display:inline-block;background:linear-gradient(135deg,#0E7FAB,#00C4B4);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">
                      Voir mes messages
                    </a>
                  </div>

                  <p style="color:#6B7A99;font-size:12px;text-align:center;margin-top:32px;border-top:1px solid #E8F0FF;padding-top:16px">
                    L'équipe NOUT 974 — Le marketplace 100 % réunionnais 🌴
                  </p>
                </div>
              </div>
            `
          )
        }

        // Push navigateur acheteur
        if (order.buyer_id) {
          fetch(`${SITE_URL}/.netlify/functions/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiver_id: order.buyer_id,
              title: '✅ Achat confirmé — NOUT 974',
              body: `Tu viens d'acheter ${annonce?.title ?? 'un article'} pour ${Number(total_price).toFixed(2)} €`,
              url: '/commandes',
            }),
          }).catch(err => console.error('send-push acheteur:', err.message))
        }

        // Push navigateur vendeur
        if (order.seller_id) {
          fetch(`${SITE_URL}/.netlify/functions/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiver_id: order.seller_id,
              title: '🎉 Tu as fait une vente — NOUT 974',
              body: `Tu viens de vendre ${annonce?.title ?? 'un article'} pour ${Number(annonce?.price ?? 0).toFixed(2)} €`,
              url: '/messages',
            }),
          }).catch(err => console.error('send-push vendeur:', err.message))
        }
      }
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
