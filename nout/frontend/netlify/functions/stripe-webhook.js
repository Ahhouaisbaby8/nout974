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

const SITE_URL = process.env.URL || 'https://nout.re'

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
      const { error: orderUpdateErr } = await supabase.from('orders').update({
        status:            'paid',
        stripe_payment_id: session.payment_intent,
      }).eq('id', orderId)
      if (orderUpdateErr) console.error(`webhook: update order ${orderId} paid:`, orderUpdateErr.message)
    }

    // 2. Marquer l'annonce comme vendue (la retire du catalogue)
    if (listingId) {
      const { error: listingUpdateErr } = await supabase.from('listings').update({ is_sold: true }).eq('id', listingId)
      if (listingUpdateErr) console.error(`webhook: update listing ${listingId} is_sold:`, listingUpdateErr.message)
    }

    // 3. Récupérer les données pour les emails
    if (orderId) {
      const [{ data: order }, { data: escrow }] = await Promise.all([
        supabase
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
          .single(),
        supabase
          .from('escrow_codes')
          .select('code, expires_at')
          .eq('order_id', orderId)
          .single(),
      ])

      if (order) {
        const { buyer, seller, listing: annonce, total_price } = order
        const titreAnnonce = escHtml(annonce?.title ?? 'ton article')
        const prixVendeur  = Number(annonce?.price ?? 0).toFixed(2)

        // Email acheteur — code de remise
        if (buyer?.email && escrow?.code) {
          const expiresDate = new Date(escrow.expires_at).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
          await sendEmail(
            buyer.email,
            `Ton code de remise — ${annonce?.title ?? 'NOUT 974'}`,
            `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
                <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
                  <div style="text-align:center;margin-bottom:24px">
                    <span style="font-size:48px">🔑</span>
                    <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Ton paiement est sécurisé !</h1>
                    <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(buyer.username)}, voici ton code de remise.</p>
                  </div>

                  <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                    <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article acheté</p>
                    <p style="margin:0 0 4px;font-weight:bold;color:#1A1A2E;font-size:16px">${titreAnnonce}</p>
                    <p style="margin:0;font-size:20px;font-weight:800;color:#1A3A8F">${Number(total_price).toFixed(2)} €</p>
                  </div>

                  <div style="background:#0A0F2C;border-radius:16px;padding:28px;margin:24px 0;text-align:center">
                    <p style="color:#00C4B4;font-size:13px;margin:0 0 12px;letter-spacing:0.05em;text-transform:uppercase;font-weight:600">Ton code de remise</p>
                    <p style="color:white;font-size:48px;font-weight:800;letter-spacing:0.15em;margin:0;font-family:monospace">${escHtml(escrow.code)}</p>
                    <p style="color:#6B7A99;font-size:12px;margin:12px 0 0">Valable jusqu'au ${expiresDate}</p>
                  </div>

                  <div style="border-left:4px solid #00C4B4;padding:12px 16px;background:#F0FFFE;border-radius:0 8px 8px 0;margin:20px 0">
                    <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                      <strong>Comment ça marche&nbsp;?</strong><br>
                      Lors de la remise en main propre, donne ce code au vendeur. Il le saisira sur NOUT pour confirmer la transaction et débloquer son paiement.
                    </p>
                  </div>

                  <p style="color:#6B7A99;font-size:13px;line-height:1.6;margin:16px 0 0">
                    ⚠️ Ne communique ce code qu'au moment de la remise, une fois que tu as bien reçu l'article et qu'il est conforme.
                    Si la remise n'a pas lieu dans les 7 jours, ton paiement sera automatiquement remboursé.
                  </p>

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
            'Tu as fait une vente ! 🎉',
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
                    <p style="margin:0 0 4px;font-weight:bold;color:#1A1A2E;font-size:16px">${titreAnnonce}</p>
                    <p style="margin:0;font-size:24px;font-weight:800;color:#00C4B4">${prixVendeur} €</p>
                  </div>

                  <div style="border-left:4px solid #1A3A8F;padding:12px 16px;background:#EEF4FF;border-radius:0 8px 8px 0;margin:20px 0">
                    <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                      <strong>Prochaine étape&nbsp;:</strong><br>
                      L'acheteur te contactera via la messagerie NOUT pour organiser la remise en main propre.
                      Il te donnera un code à 6 chiffres lors de la remise — saisis-le sur NOUT pour recevoir ton paiement.
                    </p>
                  </div>

                  <p style="color:#1A1A2E;line-height:1.6;font-size:13px">
                    Ton annonce a été automatiquement retirée du catalogue. Le paiement sera débloqué dès la confirmation de la remise.
                  </p>

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
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
            body: JSON.stringify({
              receiver_id: order.buyer_id,
              title: '🔑 Ton code de remise — NOUT 974',
              body: `Ton paiement est sécurisé. Tu recevras ton code par email.`,
              url: '/commandes',
            }),
          }).catch(err => console.error('send-push acheteur:', err.message))
        }

        // Push navigateur vendeur
        if (order.seller_id) {
          fetch(`${SITE_URL}/.netlify/functions/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
            body: JSON.stringify({
              receiver_id: order.seller_id,
              title: '🎉 Tu as fait une vente — NOUT 974',
              body: `Tu viens de vendre ${annonce?.title ?? 'un article'} pour ${prixVendeur} €`,
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
