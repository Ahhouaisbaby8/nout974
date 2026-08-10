const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { computeRefundAmount } = require('./_fees')
const { releaseSellerPayout } = require('./_payout')
const { recordHeartbeat } = require('./_heartbeat')

const escHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Init « paresseuse » : new Stripe(undefined) / createClient(undefined) JETTENT au chargement du module
// → la fonction planifiée mourrait AVANT de logger (sortie en quelques ms, « 0 travail »). On initialise
// donc à l'exécution, avec garde. Robuste même si une variable manque ponctuellement.
let _stripe = null
const getStripe = () => {
  if (_stripe) return _stripe
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY absente')
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}
let _supabase = null
const getSupabase = () => {
  if (_supabase) return _supabase
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('Config Supabase absente')
  _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

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
      body: JSON.stringify({ from: 'NOUT <contact@nout.re>', to, subject, html }),
    })
    if (!res.ok) console.error(`Resend error ${res.status} (${to}):`, await res.text())
  } catch (err) {
    console.error('Email error:', err.message)
  }
}

exports.handler = async (event) => {
  // ── AUTORISATION ──
  // On accepte une invocation UNIQUEMENT si elle vient de Netlify (planifiée OU « Run now » du dashboard)
  // ou d'un appel serveur signé. Netlify marque SES invocations avec le header X-NF-Event: schedule +
  // user-agent « Netlify Clockwork » (doc officielle) — un appel externe ne peut pas forger ce contexte.
  // Sinon, un appel HTTP direct doit présenter x-nout-cron = CRON_SECRET. Tout le reste est refusé.
  const h = event.headers || {}
  const isNetlify = (h['x-nf-event'] === 'schedule') || /clockwork/i.test(h['user-agent'] || '')
  const hasSecret = process.env.CRON_SECRET && h['x-nout-cron'] === process.env.CRON_SECRET
  if (event.httpMethod && !isNetlify && !hasSecret) {
    return { statusCode: 401, body: 'Non autorisé.' }
  }

  console.log('⏰ auto-refund démarré', new Date().toISOString())

  // Init Stripe + Supabase ICI (pas au chargement du module) → on log toujours le démarrage même si une
  // config manque, au lieu de crasher silencieusement en quelques ms (le bug des « 4 ms sans rien faire »).
  let stripe, supabase
  try { stripe = getStripe(); supabase = getSupabase() }
  catch (e) { console.error('auto-refund : config indisponible :', e.message); return { statusCode: 500, body: e.message } }

  // ── ANNULER LES COMMANDES PENDING EXPIRÉES (paiement abandonné > 1h) ──
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: stalePending } = await supabase
    .from('orders')
    .select('id, listing_id')
    .eq('status', 'pending')
    .lt('created_at', oneHourAgo)

  if (stalePending?.length > 0) {
    let cancelled = 0
    await Promise.all(stalePending.map(async (o) => {
      // Garde de statut : n'annuler QUE si la commande est TOUJOURS 'pending'. Si elle est passée 'paid'
      // entre le SELECT et maintenant (webhook Stripe d'un paiement finalisé tardivement), on ne l'annule
      // PAS et on ne remet PAS l'article en vente — sinon argent acheteur piégé + double-vente possible.
      const { data: cxl } = await supabase
        .from('orders').update({ status: 'cancelled' }).eq('id', o.id).eq('status', 'pending').select('id')
      if (cxl && cxl.length) {
        cancelled++
        await supabase.from('listings').update({ is_sold: false }).eq('id', o.listing_id)
      }
    }))
    console.log(`🧹 ${cancelled} commande(s) pending expirée(s) annulée(s).`)
  }

  // Récupérer tous les codes expirés, non confirmés, non encore remboursés
  const { data: expiredCodes, error: fetchError } = await supabase
    .from('escrow_codes')
    .select('order_id, expires_at')
    .lt('expires_at', new Date().toISOString())
    .is('confirmed_at', null)
    .is('refunded_at', null)

  if (fetchError) {
    console.error('Erreur lecture escrow_codes :', fetchError.message)
    return { statusCode: 500, body: 'Erreur lecture base de données.' }
  }

  if (!expiredCodes || expiredCodes.length === 0) {
    console.log('Aucun remboursement à traiter.')
    return { statusCode: 200, body: 'OK — rien à rembourser.' }
  }

  console.log(`${expiredCodes.length} code(s) expiré(s) à traiter.`)

  let refunded = 0
  let errors   = 0

  for (const escrow of expiredCodes) {
    const orderId = escrow.order_id
    try {
      // Récupérer la commande + infos acheteur, vendeur, annonce
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          stripe_payment_id,
          listing_id,
          buyer_id,
          seller_id,
          total_price,
          seller_payout,
          shipping_fee,
          shipping_method,
          listing:listings!listing_id(id, title),
          buyer:profiles!buyer_id(email, username),
          seller:profiles!seller_id(email, username)
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        console.error(`Commande introuvable pour order_id ${orderId}`)
        errors++
        continue
      }

      // Ne traiter que les commandes au statut 'paid' (évite les doublons)
      if (order.status !== 'paid') {
        console.log(`Order ${orderId} ignorée — statut : ${order.status}`)
        continue
      }

      if (!order.stripe_payment_id) {
        console.error(`Pas de stripe_payment_id pour order ${orderId} — remboursement impossible`)
        errors++
        continue
      }

      // Montant à rembourser — OPTION A : NOUT GARDE ses frais de protection (jamais de perte quand une vente
      // échoue par la faute d'un tiers). L'acheteur récupère le prix + le port. Garde-fou anciennes commandes :
      // remboursement PLEIN si la commande ne colle pas au nouveau modèle.
      const refundInfo = computeRefundAmount(order)

      // ── VEILLE SOLDE (NON BLOQUANTE) ──
      // La revue argent a montré qu'un BLOCAGE sur le solde ici est contre-productif : balance.retrieve()
      // renvoie le solde GLOBAL (souvent bas sur une plateforme qui verse ses vendeurs), or Stripe sait
      // rembourser depuis les fonds entrants / un léger négatif temporaire. Bloquer figerait des
      // remboursements LÉGITIMES en boucle (l'acheteur jamais remboursé → chargeback → NOUT perd plus).
      // On se contente donc d'un LOG d'alerte et on laisse Stripe gérer.
      if (refundInfo.amountCents > 0) {
        try {
          const bal = await stripe.balance.retrieve()
          const availCents = (bal.available ?? []).find(b => b.currency === 'eur')?.amount ?? 0
          if (availCents < refundInfo.amountCents) {
            console.warn(`[auto-refund] solde dispo bas order ${orderId} : ${availCents / 100} € < ${refundInfo.amountCents / 100} € (remboursement lancé quand même)`)
          }
        } catch (e) {
          console.error(`[auto-refund] lecture solde échouée order ${orderId} :`, e.message)
        }
      }

      // ── POINT DE NON-RETOUR ──
      // Verrouiller le code escrow de manière atomique avant d'appeler Stripe.
      // Si deux invocations tournaient en parallèle, une seule passerait ce filtre.
      // Verrou SYMÉTRIQUE : on refuse si le code a déjà été CONFIRMÉ (confirmed_at) — c.-à-d. si
      // confirm-escrow est en train de / a fini de verser le vendeur — autant que s'il a déjà été remboursé.
      // Sans le check confirmed_at, une commande pouvait être VERSÉE au vendeur ET REMBOURSÉE à l'acheteur.
      const { data: locked, error: lockError } = await supabase
        .from('escrow_codes')
        .update({ refunded_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .is('refunded_at', null)
        .is('confirmed_at', null)
        .select()
        .single()

      if (lockError || !locked) {
        console.log(`Order ${orderId} déjà verrouillée par une autre invocation — ignorée.`)
        continue
      }

      // Déclencher le remboursement Stripe (montant calculé plus haut).
      let refundOk = false
      try {
        await stripe.refunds.create(
          {
            payment_intent: order.stripe_payment_id,
            ...(refundInfo.amountCents > 0 ? { amount: refundInfo.amountCents } : {}),
          },
          { idempotencyKey: `refund_${orderId}` },   // anti double-remboursement
        )
        refundOk = true
        console.log(`Remboursement Stripe OK — order ${orderId} : ${refundInfo.amountCents / 100} € (${refundInfo.model}, protection gardée ${refundInfo.keptProtection} €)`)
      } catch (stripeErr) {
        // M5 — Stripe a échoué : NE PAS marquer "refunded" ni envoyer d'email "remboursé"
        // (l'acheteur croirait être remboursé alors qu'il ne l'est pas). Traitement manuel requis.
        console.error(`STRIPE REFUND ÉCHOUÉ (order ${orderId}) — traitement manuel requis :`, stripeErr.message)
        errors++
      }

      // Si le remboursement Stripe a échoué, on s'arrête là pour cette commande :
      // la commande reste "paid", l'article reste vendu, pas d'email trompeur.
      if (!refundOk) continue

      // Mettre à jour la commande + remettre l'annonce en vente
      const [{ error: orderRefundErr }, { error: listingRelistErr }] = await Promise.all([
        // Garde de statut : on ne repasse en 'refunded' que depuis 'paid' (défense en profondeur).
        supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId).eq('status', 'paid'),
        supabase.from('listings').update({ is_sold: false }).eq('id', order.listing_id),
      ])
      if (orderRefundErr)   console.error(`Update order ${orderId} refunded:`, orderRefundErr.message)
      if (listingRelistErr) console.error(`Update listing ${order.listing_id} is_sold false:`, listingRelistErr.message)

      // ── EMAILS ──
      const titreAnnonce = escHtml(order.listing?.title ?? 'l\'article')
      const montant      = (refundInfo.amountCents / 100).toFixed(2)   // montant réellement remboursé

      // auto-refund ne touche QUE les commandes 'paid' (non expédiées) : soit une remise en main propre
      // non confirmée, soit une LIVRAISON jamais expédiée par le vendeur. On adapte le wording au mode.
      const isDelivery   = order.shipping_method === 'relay' || order.shipping_method === 'home'
      const raisonAcheteur = isDelivery
        ? 'Le vendeur n\'a pas expédié l\'article dans les 7 jours.'
        : 'La remise en main propre n\'a pas été confirmée dans les 7 jours.'
      const raisonVendeur = isDelivery
        ? 'Tu n\'as pas expédié l\'article dans les 7 jours.'
        : 'La remise en main propre n\'a pas été confirmée dans les 7 jours.'
      const recoursVendeur = isDelivery
        ? 'Si tu as bien expédié l\'article mais que la commande n\'a pas été marquée comme expédiée à temps, contacte-nous à'
        : 'Si la remise a bien eu lieu mais que tu n\'as pas pu saisir le code à temps, contacte-nous à'

      // Email acheteur — remboursement
      if (order.buyer?.email) {
        await sendEmail(
          order.buyer.email,
          `Remboursement effectué — ${order.listing?.title ?? 'NOUT 974'}`,
          `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
              <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
                <div style="text-align:center;margin-bottom:24px">
                  <span style="font-size:48px">💸</span>
                  <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Tu as été remboursé</h1>
                  <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(order.buyer.username)}</p>
                </div>

                <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                  <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article concerné</p>
                  <p style="margin:0 0 4px;font-weight:bold;color:#1A1A2E;font-size:16px">${titreAnnonce}</p>
                  <p style="margin:0;font-size:24px;font-weight:800;color:#1A3A8F">${montant} €</p>
                </div>

                <div style="border-left:4px solid #F59E0B;padding:12px 16px;background:#FFFBEB;border-radius:0 8px 8px 0;margin:20px 0">
                  <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                    ${raisonAcheteur} Un remboursement de <strong>${montant} €</strong> (prix de l'article + livraison) a été effectué sur ton moyen de paiement d'origine.${refundInfo.keptProtection > 0 ? ' Conformément aux CGV, les frais de protection acheteur ne sont pas remboursables.' : ''}
                  </p>
                </div>

                <p style="color:#6B7A99;font-size:13px;line-height:1.6">
                  Le remboursement apparaît sur ton relevé bancaire sous 5 à 10 jours ouvrés selon ta banque.
                  Une question ? Écris-nous à <a href="mailto:contact@nout.re" style="color:#1A3A8F">contact@nout.re</a>.
                </p>

                <div style="text-align:center;margin-top:28px">
                  <a href="${SITE_URL}/recherche"
                     style="display:inline-block;background:linear-gradient(135deg,#0E7FAB,#00C4B4);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">
                    Continuer mes achats
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

      // Email vendeur — remise non confirmée
      if (order.seller?.email) {
        await sendEmail(
          order.seller.email,
          `Remise non confirmée — ${order.listing?.title ?? 'NOUT 974'}`,
          `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
              <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
                <div style="text-align:center;margin-bottom:24px">
                  <span style="font-size:48px">⏰</span>
                  <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Remise non confirmée</h1>
                  <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(order.seller.username)}</p>
                </div>

                <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                  <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article concerné</p>
                  <p style="margin:0;font-weight:bold;color:#1A1A2E;font-size:16px">${titreAnnonce}</p>
                </div>

                <div style="border-left:4px solid #EF4444;padding:12px 16px;background:#FFF5F5;border-radius:0 8px 8px 0;margin:20px 0">
                  <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                    ${raisonVendeur} L'acheteur a été remboursé et ton annonce a été <strong>remise en ligne automatiquement</strong>.
                  </p>
                </div>

                <p style="color:#6B7A99;font-size:13px;line-height:1.6">
                  ${recoursVendeur}
                  <a href="mailto:contact@nout.re" style="color:#1A3A8F">contact@nout.re</a> avec le numéro de commande <strong>${orderId}</strong>.
                </p>

                <div style="text-align:center;margin-top:28px">
                  <a href="${SITE_URL}/commandes"
                     style="display:inline-block;background:linear-gradient(135deg,#0E7FAB,#00C4B4);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">
                    Voir mes ventes
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

      // ── PUSH NAVIGATEUR ──
      const pushBase = `${SITE_URL}/.netlify/functions/send-push`
      if (order.buyer_id) {
        fetch(pushBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
          body: JSON.stringify({
            receiver_id: order.buyer_id,
            title: '💸 Tu as été remboursé — NOUT 974',
            body: `${montant} € remboursés pour ${order.listing?.title ?? 'ton article'}.`,
            url: '/commandes',
          }),
        }).catch(err => console.error('send-push acheteur auto-refund:', err.message))
      }
      if (order.seller_id) {
        fetch(pushBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
          body: JSON.stringify({
            receiver_id: order.seller_id,
            title: '⏰ Remise non confirmée — NOUT 974',
            body: `L'acheteur a été remboursé. Ton annonce ${order.listing?.title ?? ''} est remise en ligne.`,
            url: '/commandes',
          }),
        }).catch(err => console.error('send-push vendeur auto-refund:', err.message))
      }

      refunded++
      console.log(`✅ Order ${orderId} remboursée et annonce remise en ligne.`)

    } catch (err) {
      console.error(`Erreur inattendue pour order ${orderId} :`, err.message)
      errors++
    }
  }

  // ── FILET LIVRAISON — REMBOURSEMENT AUTO DU COLIS JAMAIS DÉPOSÉ ──
  // Cas réel (« Vend 3 pour 10€ ») : le vendeur GÉNÈRE l'étiquette (→ commande 'shipped') mais ne dépose
  // JAMAIS le colis. Le suivi transporteur ne verra donc aucune livraison → la commande resterait coincée
  // à vie en 'shipped', et l'acheteur ne serait jamais remboursé (l'ancien code ne remboursait que 'paid').
  //
  // ⚠️ RÈGLE AFFINÉE (le vrai fix) : on ne rembourse QUE si le colis n'a JAMAIS été pris en charge par le
  // transporteur — c-à-d package_stage NULL ou 'not_handed'. Un colis 'in_transit' (en route) ou 'at_relay'
  // (dispo au point relais, l'acheteur doit juste le retirer) NE DOIT PAS être remboursé : le colis existe,
  // il arrive ou attend d'être retiré. Sans ce garde-fou, on remboursait un colis deja au relais → l'acheteur
  // aurait l'article ET l'argent, le vendeur lese. 14 j = marge de scan LARGE pour le 1er evenement
  // transporteur (un vrai depot est scanne en 24-72h ; 14j sans AUCUN scan = jamais depose, quasi certain).
  let shipRefunded = 0
  const SHIP_REFUND_DAYS = 14
  const shipCutoff = new Date(Date.now() - SHIP_REFUND_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: staleShippedRaw, error: shippedErr } = await supabase
    .from('orders')
    .select(`id, status, shipped_at, delivered_at, package_stage, stripe_payment_id, total_price, seller_payout,
             shipping_fee, shipping_method, listing_id,
             listing:listings!listing_id(title),
             buyer:profiles!buyer_id(email, username)`)
    .eq('status', 'shipped')
    .is('delivered_at', null)                 // JAMAIS livré (sinon c'est le flux versement, pas remboursement)
    .lt('shipped_at', shipCutoff)
  // Garde-fou colis : on ne rembourse QUE les colis jamais pris en charge (pas ceux en transit / au relais).
  const staleShipped = (staleShippedRaw || []).filter(o => o.package_stage == null || o.package_stage === 'not_handed')

  if (shippedErr) {
    console.error('Erreur lecture commandes shipped (remboursement colis non déposé) :', shippedErr.message)
  } else if (staleShipped?.length) {
    console.log(`${staleShipped.length} commande(s) expédiée(s) non livrée(s) > ${SHIP_REFUND_DAYS}j à rembourser.`)
    for (const order of staleShipped) {
      try {
        if (!order.stripe_payment_id) {
          console.error(`Pas de stripe_payment_id (order ${order.id}) — remboursement colis non déposé impossible`)
          errors++; continue
        }
        // Verrou atomique via escrow_codes (jamais rembourser deux fois, jamais si déjà versé au vendeur).
        const { data: locked } = await supabase
          .from('escrow_codes')
          .update({ refunded_at: new Date().toISOString() })
          .eq('order_id', order.id)
          .is('refunded_at', null)
          .is('confirmed_at', null)
          .select()
          .single()
        if (!locked) { console.log(`Order ${order.id} déjà verrouillée/versée — pas de remboursement colis.`); continue }

        const refundInfo = computeRefundAmount(order)
        try {
          await stripe.refunds.create(
            { payment_intent: order.stripe_payment_id, ...(refundInfo.amountCents > 0 ? { amount: refundInfo.amountCents } : {}) },
            { idempotencyKey: `refund_${order.id}` },
          )
        } catch (stripeErr) {
          console.error(`STRIPE REFUND (colis non déposé) ÉCHOUÉ order ${order.id} :`, stripeErr.message)
          errors++; continue
        }

        // Commande → refunded (garde : uniquement depuis 'shipped'), annonce remise en vente.
        await Promise.all([
          supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id).eq('status', 'shipped'),
          supabase.from('listings').update({ is_sold: false }).eq('id', order.listing_id),
        ])
        shipRefunded++
        const montant = (refundInfo.amountCents / 100).toFixed(2)
        console.log(`✅ Remboursement colis non déposé — order ${order.id} : ${montant} €`)

        // Email acheteur
        if (order.buyer?.email) {
          await sendEmail(
            order.buyer.email,
            `Remboursement effectué — ${order.listing?.title ?? 'NOUT 974'}`,
            `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
               <h1 style="color:#1A3A8F;font-size:20px">Tu as été remboursé</h1>
               <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
                 Le colis de « ${escHtml(order.listing?.title ?? 'ton article')} » n'a pas été pris en charge par
                 le transporteur dans les délais. Ta commande est annulée et un remboursement de
                 <strong>${montant} €</strong> (prix + livraison) a été effectué sur ton moyen de paiement.
                 Il apparaîtra sous 5 à 10 jours ouvrés selon ta banque.
               </p>
             </div>`,
          )
        }
      } catch (e) {
        console.error(`Remboursement colis non déposé order ${order.id} :`, e.message)
        errors++
      }
    }
  }

  // ── RATTRAPAGE payout_pending — RÉESSAI SÉCURISÉ DES TRANSFERTS VENDEUR COINCÉS ──
  // Une vente CONFIRMÉE dont le transfert vers le porte-monnaie du vendeur a ÉCHOUÉ (solde DISPONIBLE
  // plateforme trop bas au moment T, ou compte vendeur pas prêt) reste bloquée en 'payout_pending'. Le seul
  // rattrapage existant (drain webhook account.updated) ne se déclenche QUE quand un vendeur active ses
  // paiements — rien ne réessaie quand le solde redevient positif. Ce balayage réessaie à chaque passage.
  //
  // GARDE-FOUS (durci après revue argent adverse — 4 failles corrigées) :
  //  1) Pas de compte connecté → on NE fait RIEN (surtout pas de fausse notif « argent arrivé »).
  //  2) Anti double-paiement : la clé d'idempotence Stripe n'est retenue que 24h ; comme on retente au-delà,
  //     on vérifie D'ABORD chez Stripe qu'aucun transfert n'existe déjà pour cette commande (réponse HTTP
  //     perdue lors d'un passage précédent) → sinon on marque 'completed' SANS re-transférer.
  //  3) Anti versé-pendant-litige : si le paiement acheteur est contesté (chargeback), on NE verse PAS.
  //  4) Notif au vendeur UNIQUEMENT si un vrai transfert a eu lieu ce passage (res.transferOk), jamais sur no-op.
  // Résiduel connu : course de quelques ms entre le check litige (3) et le transfert → filet = reversal webhook.
  let drained = 0
  const { data: pendingPayouts, error: pendingErr } = await supabase
    .from('orders')
    .select(`id, status, seller_id, seller_payout, stripe_payment_id,
             listing:listings!listing_id(title, price),
             seller:profiles!seller_id(email, username, stripe_account_id)`)
    .eq('status', 'payout_pending')

  if (pendingErr) {
    console.error('Erreur lecture commandes payout_pending :', pendingErr.message)
  } else if (pendingPayouts?.length) {
    console.log(`${pendingPayouts.length} commande(s) payout_pending à examiner.`)
    for (const order of pendingPayouts) {
      const vendorStripeId = order.seller?.stripe_account_id
      try {
        // GARDE 1 — pas de compte connecté : transfert impossible. On ne touche à rien (pas de fausse notif).
        if (!vendorStripeId) continue

        // GARDE 2 — anti double-paiement : un transfert existe-t-il DÉJÀ pour cette commande côté Stripe ?
        // (a) Recherche PRÉCISE par transfer_group ('order_<id>') → pas de limite/pagination, fiable à tout
        //     volume pour les transferts créés DEPUIS ce correctif (corrige le trou « limit:100 »).
        // (b) REPLI metadata pour les transferts créés AVANT ce correctif (sans transfer_group, jamais
        //     rétro-rempli par Stripe) : sinon un vieux transfert « réussi mais réponse perdue » serait
        //     invisible → re-versement. limit:100 couvre largement le volume actuel.
        // Dans les deux cas on ne compte QUE les transferts NON entièrement reversés (amount_reversed < amount,
        // aligné sur le reversal du webhook) : un transfert repris par chargeback ≠ vendeur payé.
        let alreadyTransferred = false
        try {
          const byGroup = await stripe.transfers.list({ transfer_group: `order_${order.id}`, limit: 10 })
          alreadyTransferred = (byGroup.data || []).some(t => (t.amount_reversed ?? 0) < t.amount)
          if (!alreadyTransferred) {
            const byMeta = await stripe.transfers.list({ destination: vendorStripeId, limit: 100 })
            alreadyTransferred = (byMeta.data || []).some(t =>
              String(t.metadata?.order_id) === String(order.id) && (t.amount_reversed ?? 0) < t.amount)
          }
        } catch (e) {
          console.error(`[payout-retry] transfers.list order ${order.id} :`, e.message)
          continue   // doute sur l'état Stripe → on NE transfère PAS (prudence argent)
        }
        if (alreadyTransferred) {
          const { data: fixed } = await supabase.from('orders')
            .update({ status: 'completed' }).eq('id', order.id).eq('status', 'payout_pending').select('id')
          if (fixed?.length) console.log(`[payout-retry] order ${order.id} : transfert déjà présent chez Stripe → 'completed' (pas de re-versement).`)
          continue
        }

        // GARDE 3 — anti versé-pendant-litige : si le paiement acheteur est contesté, on suspend le versement.
        if (order.stripe_payment_id) {
          try {
            const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_id, { expand: ['latest_charge'] })
            if (pi?.latest_charge && typeof pi.latest_charge === 'object' && pi.latest_charge.disputed) {
              console.warn(`[payout-retry] order ${order.id} : paiement contesté (litige) → versement suspendu.`)
              continue
            }
          } catch (e) {
            console.error(`[payout-retry] paymentIntents.retrieve order ${order.id} :`, e.message)
            continue   // doute → on ne verse pas
          }
        }

        // Transfert via le helper partagé (idempotent, garde de statut atomique). Ne réussit que si le solde
        // dispo suffit ET le compte vendeur peut recevoir. En cas d'échec : rien touché → retenté plus tard.
        const res = await releaseSellerPayout({ stripe, supabase, order })

        // GARDE 4 — notif SEULEMENT si un vrai transfert a eu lieu CE passage (jamais sur un no-op self-update).
        if (res.outcome === 'settled' && res.transferOk) {
          drained++
          console.log(`💸 payout_pending débloqué — order ${order.id} : ${res.payoutNet} € → ${vendorStripeId}`)
          if (order.seller?.email) {
            await sendEmail(
              order.seller.email,
              `Ton argent est disponible — ${order.listing?.title ?? 'NOUT 974'}`,
              `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
                 <h1 style="color:#1A3A8F;font-size:18px;margin:0 0 12px">Ton argent est arrivé 🎉</h1>
                 <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
                   Le versement de <strong>${Number(res.payoutNet).toFixed(2)} €</strong> pour « ${escHtml(order.listing?.title ?? 'ton article')} »
                   vient d'arriver dans ton porte-monnaie NOUT. Tu peux le retirer vers ta banque depuis « Mon argent ».
                 </p>
               </div>`
            )
          }
          if (order.seller_id) {
            fetch(`${SITE_URL}/.netlify/functions/send-push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
              body: JSON.stringify({
                receiver_id: order.seller_id,
                title: '💸 Ton argent est disponible — NOUT 974',
                body: `${Number(res.payoutNet).toFixed(2)} € sont arrivés dans ton porte-monnaie.`,
                url: '/compte/paiements',
              }),
            }).catch(err => console.error('send-push vendeur drain payout_pending:', err.message))
          }
        }
      } catch (e) {
        console.error(`Rattrapage payout_pending order ${order.id} :`, e.message)
        errors++
      }
    }
  }

  const summary = `auto-refund terminé — ${refunded} remboursé(s) (paid), ${shipRefunded} remboursé(s) (colis non déposé), ${drained} payout_pending débloqué(s), ${errors} erreur(s).`
  console.log(summary)
  await recordHeartbeat(supabase, 'auto-refund', summary)

  // ── ALERTE ADMIN : quand un remboursement AUTOMATIQUE a lieu, on prévient contact@nout.re ──
  // But : voir en vrai que le remboursement auto fonctionne (jamais observé jusqu'ici, thomas fait à la
  // main) + garder une trace. On n'envoie l'email QUE s'il s'est passé quelque chose (pas de spam).
  const totalRefunded = refunded + shipRefunded
  if (totalRefunded > 0) {
    await sendEmail(
      'contact@nout.re',
      `Remboursement automatique — ${totalRefunded} commande(s)`,
      `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
         <h1 style="color:#0E7FAB;font-size:19px">Remboursement(s) automatique(s) effectué(s)</h1>
         <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
           Le système a remboursé automatiquement <strong>${totalRefunded} commande(s)</strong> aujourd'hui :
           <br>• ${refunded} pour « rien envoyé / remise non confirmée » (délai 7 j)
           <br>• ${shipRefunded} pour « colis expédié mais jamais déposé » (délai 14 j)
         </p>
         <p style="color:#6B7A99;font-size:13px">Les acheteurs concernés ont été prévenus par email. Rien à faire de ton côté — ceci est juste un suivi.</p>
       </div>`,
    )
  }

  return { statusCode: 200, body: summary }
}
