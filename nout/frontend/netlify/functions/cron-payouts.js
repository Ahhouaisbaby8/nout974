// ─── VERSEMENT AUTOMATIQUE DES VENDEURS (déclenché par un cron EXTERNE) ──────────────────────────
// Point d'entrée fiable, indépendant du scheduler Netlify (qui ne déclenche pas release-delivered).
// Un service cron externe (ex. cron-job.org, gratuit) appelle cette URL toutes les heures :
//   https://nout.re/.netlify/functions/cron-payouts?key=<PAYOUT_CRON_KEY>
//
// Fait EXACTEMENT le travail attendu : verse les vendeurs dont le colis est livré depuis > 48h
// (délai de protection acheteur), via releaseSellerPayout (idempotent — jamais de double-paiement).
//
// Sécurité : la clé secrète vit dans la variable Netlify PAYOUT_CRON_KEY (jamais dans le code / GitHub).
// Un appel sans la bonne clé est refusé (403). Init Stripe/Supabase paresseuse (pas de crash au chargement).

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { releaseSellerPayout } = require('./_payout')
const { recordHeartbeat } = require('./_heartbeat')

const RECEIPT_WINDOW_HOURS = 48
const SITE_URL = process.env.URL || 'https://nout.re'

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

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NOUT <contact@nout.re>', to, subject, html }),
    })
  } catch (err) { console.error('[cron-payouts] email:', err.message) }
}

exports.handler = async (event) => {
  // Auth par clé secrète (query ?key=... OU header x-payout-key). Refuse tout appel non autorisé.
  const key = event?.queryStringParameters?.key || event?.headers?.['x-payout-key']
  if (!process.env.PAYOUT_CRON_KEY || key !== process.env.PAYOUT_CRON_KEY) {
    return { statusCode: 403, body: 'Non autorisé.' }
  }

  console.log('💰 cron-payouts démarré', new Date().toISOString())

  let stripe, supabase
  try { stripe = getStripe(); supabase = getSupabase() }
  catch (e) { console.error('[cron-payouts] config indisponible :', e.message); return { statusCode: 500, body: e.message } }

  // Commandes livrées, délai de protection écoulé.
  const cutoff = new Date(Date.now() - RECEIPT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, status, delivered_at, seller_id, buyer_id, total_price, seller_payout, stripe_payment_id,
      listing:listings!listing_id(title, price),
      seller:profiles!seller_id(email, username, stripe_account_id)
    `)
    .eq('status', 'delivered')
    .lt('delivered_at', cutoff)

  if (error) {
    console.error('[cron-payouts] lecture orders :', error.message)
    return { statusCode: 500, body: 'Erreur lecture base.' }
  }
  if (!orders?.length) {
    console.log('[cron-payouts] aucune commande à verser.')
    await recordHeartbeat(supabase, 'cron-payouts', 'RAS — aucun versement en attente.')
    return { statusCode: 200, body: 'RAS — aucun versement en attente.' }
  }

  let released = 0, skipped = 0, errors = 0
  for (const order of orders) {
    try {
      // Anti-versé-pendant-litige : si le paiement acheteur est contesté, on suspend.
      if (order.stripe_payment_id) {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_id, { expand: ['latest_charge'] })
        if (pi?.latest_charge && typeof pi.latest_charge === 'object' && pi.latest_charge.disputed) {
          console.warn(`[cron-payouts] order ${order.id} paiement contesté → suspendu.`); skipped++; continue
        }
      }
      const res = await releaseSellerPayout({ stripe, supabase, order })
      if (res.outcome === 'settled' && res.transferOk) {
        released++
        console.log(`✅ [cron-payouts] order ${order.id} versée (${res.payoutNet} €).`)
        await sendEmail(
          order.seller?.email,
          `Ton argent est disponible — ${order.listing?.title ?? 'NOUT 974'}`,
          `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
             <h1 style="color:#1A3A8F;font-size:20px">Vente finalisée</h1>
             <p style="color:#1A1A2E;font-size:14px;line-height:1.6">
               La livraison de « ${order.listing?.title ?? 'ton article'} » est confirmée et le délai de
               vérification écoulé. Ton versement de <strong>${res.payoutNet} €</strong> est en route vers
               ton porte-monnaie. Il apparaîtra sous quelques jours ouvrés (délais bancaires).
             </p>
             <p style="text-align:center;margin-top:24px">
               <a href="${SITE_URL}/mon-argent" style="background:#0E7FAB;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">Voir mon argent</a>
             </p>
           </div>`,
        )
      } else if (res.outcome === 'retry') { skipped++ }
      else { skipped++ }
    } catch (e) {
      errors++; console.error(`[cron-payouts] order ${order.id} :`, e.message)
    }
  }

  const summary = `cron-payouts terminé — ${released} versée(s), ${skipped} ignorée(s), ${errors} erreur(s).`
  console.log(summary)
  await recordHeartbeat(supabase, 'cron-payouts', summary)
  return { statusCode: 200, body: summary }
}
// redeploy trigger 1785152480 — active PAYOUT_CRON_KEY
