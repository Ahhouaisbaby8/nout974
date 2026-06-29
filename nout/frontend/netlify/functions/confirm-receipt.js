// Action ACHETEUR sur une LIVRAISON (modèle Vinted) :
//   - action 'received' (défaut) : « J'ai bien reçu » → libère le paiement au vendeur (commande 'shipped').
//   - action 'problem'           : « Signaler un problème » → passe la commande en 'disputed' (exclue de
//                                  l'auto-versement ; le support tranche).
// Le face-à-face garde son code via confirm-escrow.js. Anti-double-paiement : transfert idempotent +
// transition de statut atomique (cf. _payout.js) — on ne pose AUCUN verrou avant que l'argent soit parti.
const { checkAndAssignFounder } = require('./_founder-check')
const { releaseSellerPayout } = require('./_payout')
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

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'
const SITE_URL        = process.env.URL || 'https://nout.re'

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
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { order_id, action } = JSON.parse(event.body || '{}')
    if (!order_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètre manquant.' }) }
    const mode = action === 'problem' ? 'problem' : 'received'

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, status, seller_id, buyer_id, total_price, seller_payout, shipping_method,
        listing:listings!listing_id(title, price),
        seller:profiles!seller_id(email, username, stripe_account_id)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }

    // SEUL l'acheteur de cette commande peut agir dessus.
    if (order.buyer_id !== authUser.id) {
      console.warn(`[confirm-receipt] Accès refusé — user ${authUser.id} n'est pas l'acheteur de ${order_id}`)
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    // ── SIGNALER UN PROBLÈME : passe la livraison en litige (atomique : uniquement depuis 'shipped'). ──
    // Effet : la commande sort de 'shipped' → l'auto-versement ne la touche plus ; le support tranche.
    if (mode === 'problem') {
      const { data: disputed } = await supabase
        .from('orders')
        .update({ status: 'disputed' })
        .eq('id', order_id)
        .eq('status', 'shipped')
        .select('id')
      if (!disputed || !disputed.length) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette commande ne peut plus être signalée (déjà confirmée, remboursée ou clôturée).' }) }
      }
      sendEmail(
        'contact@nout.re',
        `Litige acheteur — commande ${order_id}`,
        `<p>L'acheteur a signalé un problème sur la commande <strong>${order_id}</strong> (« ${escHtml(order.listing?.title ?? '')} »). Statut passé en <strong>disputed</strong> : l'auto-versement est suspendu. À traiter manuellement (remboursement ou libération) — <strong>vérifier d'abord sur Stripe qu'aucun virement n'est déjà parti pour cette commande</strong> avant tout remboursement.</p>`,
      ).catch(() => {})
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'disputed' }) }
    }

    // ── J'AI BIEN REÇU : uniquement une livraison expédiée. ──
    if (order.status !== 'shipped') {
      const msg = (order.status === 'completed' || order.status === 'payout_pending')
        ? 'Cette commande est déjà confirmée.'
        : order.status === 'paid'
          ? 'Le vendeur n\'a pas encore expédié ton colis.'
          : order.status === 'disputed'
            ? 'Un problème a été signalé sur cette commande : notre équipe la traite.'
            : 'Cette commande ne peut pas être confirmée.'
      return { statusCode: 400, headers, body: JSON.stringify({ error: msg }) }
    }

    // Versement : transfert idempotent D'ABORD, finalisation atomique ENSUITE (cf. _payout.js).
    const res = await releaseSellerPayout({ stripe, supabase, order })
    if (res.outcome === 'retry') {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Le versement n\'a pas pu être finalisé à l\'instant. Réessaie dans un moment.' }) }
    }
    if (res.outcome === 'already') {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'completed' }) }
    }

    // outcome 'settled' → CET appel a finalisé la commande : notifs vendeur + éligibilité fondateur.
    await Promise.allSettled([
      checkAndAssignFounder(order.buyer_id).catch(e => console.error('[founder] buyer:', e.message)),
      checkAndAssignFounder(order.seller_id).catch(e => console.error('[founder] seller:', e.message)),
    ])

    const titreAnnonce = escHtml(order.listing?.title ?? 'l\'article')
    const montant      = res.payoutNet.toFixed(2)
    if (order.seller?.email) {
      const corps = (res.vendorStripeId && res.transferOk)
        ? `<strong>${montant} €</strong> vont être virés sur ton compte bancaire dans les prochains jours ouvrés.`
        : `Pour recevoir tes <strong>${montant} €</strong>, active tes paiements dans <strong>Paramètres → Activer les paiements</strong>.`
      await sendEmail(
        order.seller.email,
        `Ton acheteur a confirmé la réception — ${order.listing?.title ?? 'NOUT 974'}`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
            <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
              <div style="text-align:center;margin-bottom:24px">
                <span style="font-size:48px">🎉</span>
                <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Réception confirmée</h1>
                <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(order.seller.username)}, l'acheteur a bien reçu son colis.</p>
              </div>
              <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article vendu</p>
                <p style="margin:0 0 4px;font-weight:bold;color:#1A1A2E;font-size:16px">${titreAnnonce}</p>
                <p style="margin:0;font-size:24px;font-weight:800;color:#00C4B4">${montant} €</p>
              </div>
              <p style="color:#6B7A99;font-size:14px;line-height:1.6">${corps}</p>
            </div>
          </div>
        `,
      )
    }
    if (order.seller_id) {
      fetch(`${SITE_URL}/.netlify/functions/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
        body: JSON.stringify({
          receiver_id: order.seller_id,
          title: '🎉 Réception confirmée — NOUT 974',
          body: `L'acheteur a reçu « ${order.listing?.title ?? 'ton article'} ». Ton paiement est en route.`,
          url: '/commandes?tab=ventes',
        }),
      }).catch(err => console.error('send-push vendeur confirm-receipt:', err.message))
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: res.orderStatus }) }
  } catch (err) {
    console.error('[confirm-receipt] erreur:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la confirmation. Réessaie.' }) }
  }
}
