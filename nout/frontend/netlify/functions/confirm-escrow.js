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

const ALLOWED_ORIGIN = process.env.URL || 'https://effortless-tapioca-c6ab25.netlify.app'
const SITE_URL        = process.env.URL || 'https://effortless-tapioca-c6ab25.netlify.app'

// Rate limiter en mémoire — 10 tentatives/min par IP (protection brute-force code)
const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 10, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: 'onboarding@resend.dev', to, subject, html }),
    })
    if (!res.ok) {
      console.error(`Resend error ${res.status} (${to}):`, await res.text())
    }
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

  // Rate limiting
  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  // Vérification JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  }

  try {
    const { order_id, code } = JSON.parse(event.body)

    if (!order_id || !code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres manquants.' }) }
    }

    // Validation stricte : le code doit être exactement 6 chiffres
    if (!/^\d{6}$/.test(String(code).trim())) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Format de code invalide.' }) }
    }

    // Récupérer la commande complète (vendeur, acheteur, annonce)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        seller_id,
        buyer_id,
        total_price,
        listing:listings!listing_id(title, price),
        buyer:profiles!buyer_id(email, username),
        seller:profiles!seller_id(email, username, stripe_account_id)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }
    }

    // Seul le vendeur peut confirmer la remise
    if (order.seller_id !== authUser.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    if (order.status === 'completed' || order.status === 'payout_pending') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette remise a déjà été confirmée.' }) }
    }

    // Récupérer le code escrow
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_codes')
      .select('code, expires_at, confirmed_at')
      .eq('order_id', order_id)
      .single()

    if (escrowError || !escrow) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Code de remise introuvable.' }) }
    }

    if (escrow.confirmed_at) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ce code a déjà été utilisé.' }) }
    }

    if (new Date(escrow.expires_at) < new Date()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ce code a expiré. Le paiement sera remboursé à l\'acheteur automatiquement.' }) }
    }

    if (escrow.code !== String(code).trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Code incorrect. Vérifie le code auprès de l\'acheteur.' }) }
    }

    // ── POINT DE NON-RETOUR ──
    // On marque confirmed_at en premier pour éviter toute double confirmation
    // même si la suite échoue. Le filtre .is('confirmed_at', null) est atomique.
    const { data: locked, error: lockError } = await supabase
      .from('escrow_codes')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('order_id', order_id)
      .is('confirmed_at', null)
      .select()
      .single()

    if (lockError || !locked) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Cette remise a déjà été confirmée.' }) }
    }

    // Transfert Stripe vers le vendeur
    // Montant = prix de l'article (sans les frais acheteur que NOUT conserve)
    const prixArticle    = Number(order.listing?.price ?? 0)
    const transferCents  = Math.round(prixArticle * 100)
    const vendorStripeId = order.seller?.stripe_account_id

    let transferOk = false

    if (vendorStripeId) {
      try {
        await stripe.transfers.create({
          amount:      transferCents,
          currency:    'eur',
          destination: vendorStripeId,
          metadata:    { order_id },
        })
        transferOk = true
        console.log(`Transfert Stripe OK : ${transferCents / 100} € → ${vendorStripeId}`)
      } catch (stripeErr) {
        // confirmed_at déjà posé — l'échec Stripe doit être traité manuellement
        console.error(`TRANSFERT ÉCHOUÉ (order ${order_id}) :`, stripeErr.message)
      }
    } else {
      console.log(`Vendeur sans compte Stripe (order ${order_id}) — statut payout_pending`)
    }

    // Statut selon disponibilité du compte Stripe vendeur :
    // - 'completed'      → remise confirmée + transfert déclenché
    // - 'payout_pending' → remise confirmée mais vendeur sans compte Stripe (transfert à faire après onboarding)
    const orderStatus = (vendorStripeId && transferOk) ? 'completed' : 'payout_pending'
    await supabase.from('orders').update({ status: orderStatus }).eq('id', order_id)

    // ── EMAILS ──
    const titreAnnonce = escHtml(order.listing?.title ?? 'l\'article')
    const prixAffiche  = prixArticle.toFixed(2)

    // Email acheteur — remise confirmée
    if (order.buyer?.email) {
      await sendEmail(
        order.buyer.email,
        `Remise confirmée — ${order.listing?.title ?? 'NOUT 974'}`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
            <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
              <div style="text-align:center;margin-bottom:24px">
                <span style="font-size:48px">🤝</span>
                <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Remise confirmée !</h1>
                <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(order.buyer.username)}, la transaction est terminée.</p>
              </div>

              <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article récupéré</p>
                <p style="margin:0;font-weight:bold;color:#1A1A2E;font-size:16px">${titreAnnonce}</p>
              </div>

              <div style="background:#EDFAF7;border:1px solid #00C4B4;border-radius:12px;padding:16px;margin:20px 0">
                <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                  ✅ Le vendeur a confirmé la remise en main propre. Ton paiement a bien été libéré. Merci d'avoir utilisé NOUT 974 !
                </p>
              </div>

              <p style="color:#6B7A99;font-size:13px;line-height:1.6">
                Si tu as eu un souci lors de la transaction, contacte-nous à
                <a href="mailto:contact@nout974.re" style="color:#1A3A8F">contact@nout974.re</a>.
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

    // Email vendeur — virement en route (ou invitation à activer les paiements)
    if (order.seller?.email) {
      const emailVendeur = vendorStripeId
        ? `
            <div style="background:#EDFAF7;border:1px solid #00C4B4;border-radius:12px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                💸 <strong>${prixAffiche} €</strong> vont être virés sur ton compte bancaire dans les prochains jours ouvrés, selon les délais Stripe.
              </p>
            </div>
            <p style="color:#6B7A99;font-size:13px;line-height:1.6">
              Tu peux suivre le statut de tes virements depuis le Dashboard Stripe connecté à ton compte NOUT.
            </p>
          `
        : `
            <div style="background:#FFF8E8;border:1px solid #F59E0B;border-radius:12px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#1A1A2E;font-size:14px;line-height:1.6">
                ⚠️ Tu n'as pas encore activé les paiements sur ton compte NOUT. Pour recevoir tes <strong>${prixAffiche} €</strong>, rends-toi dans tes <strong>Paramètres → Activer les paiements</strong>.
              </p>
            </div>
            <div style="text-align:center;margin:20px 0">
              <a href="${SITE_URL}/parametres?stripe=pending"
                 style="display:inline-block;background:linear-gradient(135deg,#0E7FAB,#00C4B4);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">
                Activer mes paiements
              </a>
            </div>
          `

      await sendEmail(
        order.seller.email,
        vendorStripeId && transferOk ? 'Ton virement est en route 🎉' : 'Active tes paiements pour recevoir ton argent 💸',
        `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
            <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
              <div style="text-align:center;margin-bottom:24px">
                <span style="font-size:48px">🎉</span>
                <h1 style="color:#1A3A8F;font-size:22px;margin:12px 0 4px">Remise confirmée !</h1>
                <p style="color:#6B7A99;margin:0">Bonjour ${escHtml(order.seller.username)}, la transaction est bien enregistrée.</p>
              </div>

              <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin:20px 0">
                <p style="margin:0 0 8px;color:#6B7A99;font-size:13px">Article vendu</p>
                <p style="margin:0 0 4px;font-weight:bold;color:#1A1A2E;font-size:16px">${titreAnnonce}</p>
                <p style="margin:0;font-size:24px;font-weight:800;color:#00C4B4">${prixAffiche} €</p>
              </div>

              ${emailVendeur}

              <p style="color:#6B7A99;font-size:12px;text-align:center;margin-top:32px;border-top:1px solid #E8F0FF;padding-top:16px">
                L'équipe NOUT 974 — Le marketplace 100 % réunionnais 🌴
              </p>
            </div>
          </div>
        `
      )
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Remise confirmée. Le paiement a été libéré.' }),
    }

  } catch (err) {
    console.error('confirm-escrow error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur. Réessaie ou contacte le support.' }) }
  }
}
