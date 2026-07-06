// Action ACHETEUR sur une LIVRAISON :
//   - action 'problem'  : « Signaler un problème » → passe la commande en 'disputed' (le support tranche).
//   - action 'received' : DÉSACTIVÉE. La réception d'un colis n'est plus validée par l'acheteur ; elle le
//     sera par le SUIVI DU TRANSPORTEUR (à brancher). Cette fonction ne déclenche donc PLUS aucun versement
//     vendeur — elle ne fait que gérer le signalement de problème.
// Le face-à-face garde son code via confirm-escrow.js.
const { createClient } = require('@supabase/supabase-js')
const { rateLimit, getClientIp, TOO_MANY } = require('./_rate-limit')

const escHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

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

  // Anti-flooding : max 10 signalements/min par IP
  if (rateLimit(getClientIp(event), 'confirm-receipt', 10)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
  }

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

    // ── « J'AI BIEN REÇU » DÉSACTIVÉ pour la livraison ──
    // La réception d'un colis n'est plus validée par l'acheteur : ce sera le SUIVI DU TRANSPORTEUR
    // qui confirmera la livraison (à brancher). L'acheteur ne peut donc plus débloquer le paiement —
    // il peut seulement « Signaler un problème » (mode 'problem' ci-dessus). AUCUN mouvement d'argent ici.
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'La réception est validée automatiquement via le suivi du transporteur. En cas de souci, utilise « Signaler un problème ».',
        code: 'received_disabled',
      }),
    }
  } catch (err) {
    console.error('[confirm-receipt] erreur:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la confirmation. Réessaie.' }) }
  }
}
