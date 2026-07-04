// ─── Libération du paiement après livraison (cron) ────────────────────────────────
//
// Ferme la chaîne livraison : une commande passée en 'delivered' (par le suivi
// transporteur : chronopost-tracking.js pour Chronopost, UBN plus tard) est versée au
// vendeur APRÈS un délai de protection acheteur. Pendant ce délai, l'acheteur peut
// « Signaler un problème » (→ 'disputed', géré ailleurs) : on ne verse alors JAMAIS.
//
// Générique (tous transporteurs) : on ne regarde que status='delivered' + delivered_at.
//
// ── GARANTIES ARGENT (NOUT jamais dans le rouge) ──────────────────────────────────
//  - L'argent de l'acheteur est DÉJÀ encaissé chez NOUT/Stripe depuis le paiement.
//    On ne « sort » rien : on libère de l'argent déjà détenu. Jamais d'avance.
//  - Versement délégué à releaseSellerPayout (_payout.js, autre PC) : idempotent
//    (idempotencyKey), transfert d'abord puis statut atomique, ignore 'disputed'.
//  - On ne verse que depuis 'delivered' → jamais un litige, jamais une commande déjà réglée.
//  - Après le versement, Stripe ajoute SES délais (pending 2-3j + retrait banque 2-3j) :
//    sas supplémentaire naturel, rien à coder.
//
// Statuts : paid → shipped → delivered → (48h ici) → completed / payout_pending.
//
// Lancé par un cron Netlify. Auth : header x-nout-cron = CRON_SECRET.

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { releaseSellerPayout } = require('./_payout')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const SITE_URL = process.env.URL || 'https://nout.re'

// Délai de protection acheteur après livraison constatée (choix commercial NOUT).
// 48h = standard du marché (Vinted/Vestiaire). L'acheteur a ce temps pour ouvrir le
// colis et « Signaler un problème » avant que le vendeur soit payé.
const RECEIPT_WINDOW_HOURS = 48

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || !to) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NOUT <contact@nout.re>', to, subject, html }),
    })
    if (!res.ok) console.error(`Resend error ${res.status} (${to}):`, await res.text())
  } catch (err) { console.error('Email error:', err.message) }
}

exports.handler = async (event) => {
  // Auth cron (invocation planifiée = pas de httpMethod ; appel HTTP direct = secret requis)
  if (event.httpMethod) {
    const secret = process.env.CRON_SECRET
    if (!secret || event.headers['x-nout-cron'] !== secret) {
      return { statusCode: 401, body: 'Non autorisé.' }
    }
  }

  console.log('💰 release-delivered démarré', new Date().toISOString())

  // Commandes livrées dont le délai de réception est écoulé, pas en litige.
  const cutoff = new Date(Date.now() - RECEIPT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, status, delivered_at, seller_id, buyer_id, total_price, seller_payout,
      stripe_payment_id,
      listing:listings!listing_id(title, price),
      seller:profiles!seller_id(email, username, stripe_account_id)
    `)
    .eq('status', 'delivered')
    .lt('delivered_at', cutoff)

  if (error) {
    console.error('release-delivered : lecture orders échouée :', error.message)
    return { statusCode: 500, body: 'Erreur lecture base.' }
  }
  if (!orders || orders.length === 0) {
    return { statusCode: 200, body: 'Aucune commande à libérer.' }
  }

  let released = 0, skipped = 0, errors = 0

  for (const order of orders) {
    try {
      // Anti-versé-pendant-litige : si le paiement acheteur est contesté chez Stripe, on suspend.
      if (order.stripe_payment_id) {
        try {
          const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_id, { expand: ['latest_charge'] })
          if (pi?.latest_charge && typeof pi.latest_charge === 'object' && pi.latest_charge.disputed) {
            console.warn(`release-delivered : order ${order.id} paiement contesté → versement suspendu.`)
            skipped++
            continue
          }
        } catch (e) {
          console.error(`release-delivered : paymentIntents.retrieve order ${order.id} :`, e.message)
          skipped++
          continue // doute sur l'état Stripe → on ne verse pas (prudence argent)
        }
      }

      // ⚠️ releaseSellerPayout autorise paid/shipped/payout_pending mais PAS 'delivered'.
      // On repositionne d'abord la commande en 'shipped' de façon ATOMIQUE (rowcount) : seul
      // le 1er passage gagne, et si un litige l'a fait passer 'disputed' entre-temps, l'update
      // ne touche 0 ligne → on ne verse pas. C'est le sas anti-course sûr.
      const { data: moved } = await supabase
        .from('orders')
        .update({ status: 'shipped' })
        .eq('id', order.id)
        .eq('status', 'delivered')
        .select('id')
      if (!moved || !moved.length) { skipped++; continue } // déjà traité ou passé en litige

      const res = await releaseSellerPayout({ stripe, supabase, order })

      if (res.outcome === 'settled' && res.transferOk) {
        released++
        console.log(`✅ release-delivered : order ${order.id} versée (${res.payoutNet} €).`)
        // Email vendeur : argent disponible
        await sendEmail(
          order.seller?.email,
          `Ton argent est disponible — ${order.listing?.title ?? 'NOUT 974'}`,
          `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
             <h1 style="color:#1A3A8F;font-size:20px">Vente finalisée</h1>
             <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
               La livraison de « ${order.listing?.title ?? 'ton article'} » a été confirmée et le délai
               de vérification est écoulé. Ton versement de <strong>${res.payoutNet} €</strong> est en route
               vers ton porte-monnaie. Il apparaîtra sous quelques jours ouvrés (délais bancaires).
             </p>
             <p style="text-align:center;margin-top:24px">
               <a href="${SITE_URL}/mon-argent" style="background:#0E7FAB;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">Voir mon argent</a>
             </p>
           </div>`,
        )
      } else if (res.outcome === 'retry') {
        // Échec transitoire (transfert/écriture) : la commande a été remise 'shipped' → le
        // prochain passage la reprendra (elle n'est plus 'delivered', mais releaseSellerPayout
        // accepte 'shipped'). Rejouable, aucun argent figé.
        console.warn(`release-delivered : order ${order.id} outcome=retry, sera repris.`)
        skipped++
      } else {
        // 'already' : un autre passage a déjà versé. Rien à faire.
        skipped++
      }
    } catch (err) {
      console.error(`release-delivered : order ${order.id} échouée :`, err.message)
      errors++
    }
  }

  const summary = `release-delivered terminé — ${released} versée(s), ${skipped} ignorée(s), ${errors} erreur(s).`
  console.log(summary)
  return { statusCode: 200, body: summary }
}
