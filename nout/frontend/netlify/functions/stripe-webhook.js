const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { releaseSellerPayout } = require('./_payout')

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
        from: 'NOUT <contact@nout.re>',
        to,
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      console.error(`Resend error ${res.status}:`, errBody)
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

    // C1 — Ne traiter QUE si le paiement a réellement réussi (paiements asynchrones,
    // sessions expirées… peuvent arriver en "completed" mais "unpaid" → on ignore).
    if (session.payment_status !== 'paid') {
      console.warn(`webhook: session ${session.id} payment_status=${session.payment_status} → ignorée`)
      return { statusCode: 200, body: 'Paiement non confirmé, ignoré' }
    }

    // C2 — Idempotence : on ne passe la commande paid QUE si elle était encore "pending".
    // Si Stripe re-livre l'événement, l'update n'affecte 0 ligne → on n'envoie pas
    // une 2e fois emails/notifs/codes.
    let firstTime = false
    if (orderId) {
      const { data: updated, error: orderUpdateErr } = await supabase.from('orders').update({
        status:            'paid',
        stripe_payment_id: session.payment_intent,
      }).eq('id', orderId).eq('status', 'pending').select('id')
      if (orderUpdateErr) {
        // C7 — erreur DB récupérable : renvoyer 5xx pour que Stripe REJOUE l'événement
        // (sinon la commande reste coincée en pending et serait annulée à tort).
        console.error(`webhook: update order ${orderId} paid:`, orderUpdateErr.message)
        return { statusCode: 500, body: 'Erreur DB, à rejouer' }
      }
      firstTime = !!(updated && updated.length > 0)
    }

    // Événement déjà traité (re-livraison Stripe) → on s'arrête, pas de doublon.
    if (!firstTime) {
      return { statusCode: 200, body: 'Déjà traité' }
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
            shipping_method,
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
        const isLivraison  = order.shipping_method === 'relay' || order.shipping_method === 'home'
        const modeLabel    = order.shipping_method === 'relay' ? 'Point relais Chronopost'
                           : order.shipping_method === 'home'  ? 'Livraison à domicile Chronopost'
                           : 'Remise en main propre'

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
                    <p style="margin:0 0 6px;color:#6B7A99;font-size:13px"><strong>Mode choisi :</strong> ${escHtml(modeLabel)}</p>
                    <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                      <strong>Comment ça marche&nbsp;?</strong><br>
                      ${isLivraison
                        ? `À la réception de ton colis, donne ce code au vendeur (par message NOUT) une fois l'article vérifié et conforme. Il le saisira pour débloquer son paiement.`
                        : `Lors de la remise en main propre, donne ce code au vendeur. Il le saisira sur NOUT pour confirmer la transaction et débloquer son paiement.`}
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
                    <p style="margin:0 0 6px;color:#6B7A99;font-size:13px"><strong>Mode choisi par l'acheteur :</strong> ${escHtml(modeLabel)}</p>
                    <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                      <strong>Prochaine étape&nbsp;:</strong><br>
                      ${isLivraison
                        ? `Prépare ton colis et expédie-le via ${escHtml(modeLabel)}. Indique le numéro de suivi sur NOUT depuis « Mes commandes ». À la réception, l'acheteur te donnera un code à 6 chiffres — saisis-le pour recevoir ton paiement.`
                        : `L'acheteur te contactera via la messagerie NOUT pour organiser la remise en main propre. Il te donnera un code à 6 chiffres lors de la remise — saisis-le sur NOUT pour recevoir ton paiement.`}
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

        // Notifications in-app (centre de notifs) — best-effort, service_role
        const notifs = []
        if (order.seller_id) notifs.push({
          user_id: order.seller_id, type: 'sale',
          title: 'Vente réalisée',
          body: `Tu as vendu "${annonce?.title ?? 'un article'}" pour ${prixVendeur} €`,
          link: '/commandes?tab=ventes',
        })
        if (order.buyer_id) notifs.push({
          user_id: order.buyer_id, type: 'escrow_code',
          title: 'Paiement confirmé',
          body: `Ton code de remise pour "${annonce?.title ?? 'ton article'}" t'a été envoyé par email`,
          link: '/commandes?tab=achats',
        })
        if (notifs.length) {
          const { error: notifErr } = await supabase.from('notifications').insert(notifs)
          if (notifErr) console.error('webhook: insert notifications:', notifErr.message)
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

      // Le vendeur vient d'activer ses paiements : on DRAINE ses commandes 'payout_pending' (confirmées
      // mais jamais versées faute de compte Stripe au moment de la confirmation). Le transfert est
      // idempotent (transfer_${order_id}) → aucun double-paiement même si l'évènement est rejoué.
      const { data: seller } = await supabase.from('profiles')
        .select('id').eq('stripe_account_id', account.id).single()
      if (seller?.id) {
        const { data: pending } = await supabase.from('orders')
          .select(`id, status, seller_payout, seller_id,
                   listing:listings!listing_id(title, price),
                   seller:profiles!seller_id(stripe_account_id)`)
          .eq('seller_id', seller.id)
          .eq('status', 'payout_pending')
        for (const order of (pending ?? [])) {
          try { await releaseSellerPayout({ stripe, supabase, order }) }
          catch (e) { console.error(`[webhook] drain payout_pending ${order.id} :`, e.message) }
        }
        if (pending?.length) console.log(`[webhook] ${pending.length} payout_pending drainé(s) pour vendeur ${seller.id}`)
      }
    }
  }

  if (stripeEvent.type === 'charge.dispute.created') {
    const dispute = stripeEvent.data.object
    const paymentIntent = dispute.payment_intent
    if (paymentIntent) {
      // Contestation bancaire (chargeback) de l'acheteur. Modèle « separate charges & transfers » : la banque
      // reprend le montant sur le solde PLATEFORME, mais le versement déjà poussé au vendeur n'est PAS reversé
      // automatiquement. On (1) flague la commande 'chargeback' [→ gèle les retraits du vendeur, cf.
      // request-payout/sweep-wallets], (2) tente de RAPPELER le transfert encore dans le wallet du vendeur
      // (reversal) pour que NOUT ne perde pas le prix, (3) alerte l'admin pour le résiduel (CGV §8).
      const { data: order } = await supabase.from('orders')
        .select('id, status, seller_id, listing:listings!listing_id(title), seller:profiles!seller_id(stripe_account_id)')
        .eq('stripe_payment_id', paymentIntent)
        .maybeSingle()
      if (order && order.status !== 'chargeback') {
        await supabase.from('orders').update({ status: 'chargeback' }).eq('id', order.id)
        const montant = ((dispute.amount ?? 0) / 100).toFixed(2)

        // (2) Récupération auto : rappeler le transfert vendeur tant que les fonds sont ENCORE dans son wallet.
        let reversalNote = 'Aucun versement vendeur identifié à récupérer.'
        const vendorStripeId = order.seller?.stripe_account_id
        if (vendorStripeId) {
          try {
            const transfers = await stripe.transfers.list({ destination: vendorStripeId, limit: 100 })
            const t = transfers.data.find((x) => String(x.metadata?.order_id) === String(order.id) && x.amount_reversed < x.amount)
            if (t) {
              const rev = await stripe.transfers.createReversal(
                t.id,
                { amount: t.amount - t.amount_reversed, metadata: { order_id: String(order.id), reason: 'chargeback' } },
                { idempotencyKey: `revchargeback_${order.id}` },
              )
              reversalNote = `Versement vendeur RÉCUPÉRÉ : ${(rev.amount / 100).toFixed(2)} € rapatriés du porte-monnaie du vendeur.`
            } else {
              reversalNote = 'Transfert vendeur introuvable ou déjà entièrement rappelé — à vérifier manuellement.'
            }
          } catch (e) {
            reversalNote = `Récupération auto ÉCHOUÉE (${e.message}) — le vendeur a probablement déjà retiré ses fonds. Récupérer via CGV §8.`
          }
        }

        await sendEmail(
          'contact@nout.re',
          `Chargeback reçu — commande ${order.id}`,
          `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
             <h1 style="color:#B91C1C;font-size:18px;margin:0 0 12px">Contestation bancaire (chargeback)</h1>
             <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
               Contestation de <strong>${montant} €</strong> sur la commande <strong>${order.id}</strong>
               (« ${escHtml(order.listing?.title ?? 'article')} »). Statut → <strong>chargeback</strong> (retraits du vendeur gelés).
             </p>
             <p style="color:#1A1A2E;font-size:14px;line-height:1.6"><strong>Récupération :</strong> ${escHtml(reversalNote)}</p>
             <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
               À traiter dans Stripe (fournir les preuves si la contestation est infondée). Résiduel éventuel
               (protection + port + frais de litige) à récupérer auprès du vendeur (CGV §8).
             </p>
           </div>`,
        )
        console.log(`[webhook] chargeback order ${order.id} (${montant} €) — ${reversalNote}`)
      }
    }
  }

  return { statusCode: 200, body: 'OK' }
}
