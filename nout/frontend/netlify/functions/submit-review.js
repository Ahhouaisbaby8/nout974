const { createClient } = require('@supabase/supabase-js')
const { rateLimit, getClientIp, TOO_MANY } = require('./_rate-limit')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'
const SITE_URL       = process.env.URL || 'https://nout.re'

const escHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

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
    if (!res.ok) console.error(`Resend error ${res.status}:`, await res.text())
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

  // Anti-flooding : max 5 avis/min par IP (spam d'avis)
  if (rateLimit(getClientIp(event), 'submit-review', 5)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
  }

  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { order_id, rating, comment } = JSON.parse(event.body ?? '{}')

    if (!order_id || !rating) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres manquants.' }) }
    }
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Note invalide (1-5).' }) }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, status, buyer_id, seller_id,
        listing:listings!listing_id(title),
        seller:profiles!seller_id(email, username),
        buyer:profiles!buyer_id(username)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }
    }
    if (order.buyer_id !== authUser.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }
    if (order.status !== 'completed') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "La transaction n'est pas encore terminée." }) }
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle()

    if (existing) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Tu as déjà laissé un avis pour cette transaction.' }) }
    }

    const { error: insertError } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: authUser.id,
        seller_id:   order.seller_id,
        order_id,
        rating:      Number(rating),
        comment:     comment?.trim() || null,
      })

    if (insertError) {
      console.error('Insert review error:', insertError.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Erreur lors de la publication de l'avis." }) }
    }

    if (order.seller?.email) {
      const stars            = '⭐'.repeat(Number(rating))
      const articleTitle     = escHtml(order.listing?.title ?? 'un article')
      const reviewerUsername = escHtml(order.buyer?.username ?? 'Un acheteur')
      const sellerUsername   = escHtml(order.seller?.username ?? 'Vendeur')
      const commentSection   = comment?.trim()
        ? `<div style="background:#F5F0E8;border-radius:12px;padding:16px;margin:16px 0">
             <p style="margin:0 0 8px;color:#6B7A99;font-size:12px">Commentaire</p>
             <p style="margin:0;color:#1A1A2E;font-size:14px;font-style:italic">"${escHtml(comment.trim())}"</p>
           </div>`
        : ''

      await sendEmail(
        order.seller.email,
        `Tu as reçu un avis ⭐ — NOUT 974`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
            <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
              <div style="text-align:center;margin-bottom:24px">
                <span style="font-size:48px">⭐</span>
                <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Nouvel avis reçu !</h1>
                <p style="color:#6B7A99;margin:0">Bonjour ${sellerUsername}, ${reviewerUsername} a laissé un avis sur ta vente.</p>
              </div>

              <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
                <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article vendu</p>
                <p style="margin:0 0 12px;font-weight:bold;color:#1A1A2E;font-size:16px">${articleTitle}</p>
                <p style="margin:0;font-size:28px">${stars}</p>
                <p style="margin:8px 0 0;font-size:18px;font-weight:800;color:#0E7FAB">${Number(rating)}/5</p>
              </div>

              ${commentSection}

              <div style="text-align:center;margin-top:28px">
                <a href="${SITE_URL}/profil/${order.seller_id}"
                   style="display:inline-block;background:linear-gradient(135deg,#0E7FAB,#00C4B4);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">
                  Voir mon profil
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

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error('submit-review error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) }
  }
}
