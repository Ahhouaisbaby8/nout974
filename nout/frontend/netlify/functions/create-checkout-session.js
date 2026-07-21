const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { randomInt } = require('crypto')
// Frais NOUT : source unique partagée (voir _fees.js) — DOIT rester synchronisée avec src/utils/shipping.js.
// Modèle « protection acheteur » : le vendeur reçoit son prix plein, les frais sont ajoutés à l'acheteur.
const { SHIPPING_FEES, computeProtectionFee, computeShippingFeeBuffer, computeTotals, computeSellerPayout } = require('./_fees')
const { isUbnCovered } = require('./_ubn-cities')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Rate limiter en mémoire — 10 req/min par IP
const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 10, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Rate limiting
  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  // Vérification JWT — l'appelant doit être authentifié
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  }

  try {
    const {
      listingId, buyerId, deliveryId, relayId, relayName, offerId,
      shippingPhone, shippingAddress, shippingCity, shippingPostcode,
    } = JSON.parse(event.body)

    // L'utilisateur authentifié doit être le buyer déclaré
    if (authUser.id !== buyerId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    // VALIDATION E-MAIL DIFFÉRÉE : acheter exige une adresse vérifiée (migration
    // 20260707_email_verified). Comptes Google = vérifiés d'office (Google fait foi).
    // FAIL-OPEN assumé : si la colonne n'existe pas encore (migration pas passée) ou si la
    // lecture échoue, on N'EMPÊCHE PAS l'achat (aucun client légitime bloqué à tort ; le
    // risque « acheteur non vérifié » = il paie de l'argent réel, pas un vecteur de spam).
    // AUCUN impact sur les montants : simple refus AVANT toute création de commande.
    const isGoogle = authUser.app_metadata?.provider === 'google'
      || (authUser.app_metadata?.providers ?? []).includes('google')
    if (!isGoogle) {
      const { data: buyerProf, error: buyerProfErr } = await supabase
        .from('profiles')
        .select('email_verified_at')
        .eq('id', buyerId)
        .single()
      if (!buyerProfErr && buyerProf && buyerProf.email_verified_at == null) {
        return { statusCode: 403, headers, body: JSON.stringify({
          error: 'Vérifie ton adresse e-mail pour acheter : clique sur le lien reçu par e-mail à ton inscription.',
          code: 'email_unverified',
        }) }
      }
    }

    // Option de livraison : id validé contre la table serveur (défaut main propre). Le transporteur et
    // le mode sont DÉDUITS de l'option ici (jamais crus du client), pour éviter toute incohérence prix.
    const optionId = SHIPPING_FEES[deliveryId] !== undefined ? deliveryId : 'hand'
    const OPTION_META = {
      hand:         { carrier: null,         genericMethod: 'hand',  isRelay: false, isHome: false },
      ubn_relay:    { carrier: 'ubn',        genericMethod: 'relay', isRelay: true,  isHome: false },
      chrono_relay: { carrier: 'chronopost', genericMethod: 'relay', isRelay: true,  isHome: false },
      ubn_home:     { carrier: 'ubn',        genericMethod: 'home',  isRelay: false, isHome: true  },
      chrono_home:  { carrier: 'chronopost', genericMethod: 'home',  isRelay: false, isHome: true  },
    }
    const meta = OPTION_META[optionId] || OPTION_META.hand
    const isDelivery = optionId !== 'hand'

    const clean = (s) => (typeof s === 'string' ? s.trim().slice(0, 200) : '')
    const phone = clean(shippingPhone), addr = clean(shippingAddress)
    const cityShip = clean(shippingCity), postcode = clean(shippingPostcode)
    const relay = clean(relayId), relayLbl = clean(relayName)

    // Domicile : adresse complète + téléphone. Point relais : relais choisi + CP/ville + téléphone.
    if (meta.isHome && (!phone || !addr || !cityShip || !postcode)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Adresse et téléphone obligatoires pour une livraison à domicile.' }) }
    }
    // UBN à domicile : la commune DOIT être desservie (doc §20). Sinon l'étiquette échouerait après paiement
    // (city_postcode_mismatch) → remboursement, NOUT perd le port. On bloque AVANT le paiement.
    if (optionId === 'ubn_home' && !isUbnCovered(cityShip)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette commune n\'est pas desservie par UBN à domicile. Choisis un point relais, ou la livraison Chronopost.' }) }
    }
    if (meta.isRelay && (!relay || !phone || !cityShip || !postcode)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Point relais, code postal, ville et téléphone obligatoires pour un retrait en point relais.' }) }
    }

    // Récupérer l'annonce (plus besoin du stripe_account_id vendeur)
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, profiles(id, email)')
      .eq('id', listingId)
      .single()

    if (error || !listing) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Annonce introuvable.' }) }
    }

    // ── GARDE « MISE EN RELATION » ── : les annonces véhicule ne passent JAMAIS par le paiement NOUT
    // (frais Stripe démesurés + risque juridique d'intermédiaire de paiement régulé sur gros montants).
    // sale_mode est imposé côté base par un trigger dérivé de la catégorie ; on re-teste ICI la catégorie
    // NORMALISÉE (trim/lowercase) + la SOUS-catégorie 'vehic-*' → sûr même si la migration n'a pas encore
    // tourné, et robuste à une casse/typo. Le plafond de montant plus bas est le filet INDÉPENDANT de la
    // catégorie (contre une voiture mal catégorisée). Aucune commande / aucun code escrow créé ici.
    const _norm = (s) => String(s ?? '').trim().toLowerCase()
    const _cat = _norm(listing.category), _sub = _norm(listing.subcategory)
    const isVehicleListing = _cat === 'vehicules' || _cat.startsWith('vehic-') || _sub.startsWith('vehic-')
    if (listing.sale_mode === 'contact' || isVehicleListing) {
      return { statusCode: 400, headers, body: JSON.stringify({
        error: 'Cette annonce se règle en direct avec le vendeur (mise en relation). Contacte-le via la messagerie.',
        code: 'contact_only',
      }) }
    }

    // Un vendeur ne peut pas acheter sa propre annonce
    if (listing.user_id === buyerId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tu ne peux pas acheter ta propre annonce.' }) }
    }

    // Garde blocage : pas d'achat si un blocage existe entre l'acheteur et le vendeur
    // (un sens ou l'autre). Service key → RLS bypassée, d'où cette vérif explicite.
    const { data: blockRows } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${buyerId},blocked_id.eq.${listing.user_id}),and(blocker_id.eq.${listing.user_id},blocked_id.eq.${buyerId})`)
      .limit(1)
    if (blockRows && blockRows.length > 0) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Vous ne pouvez pas acheter auprès de ce vendeur (blocage).' }) }
    }

    if (listing.is_sold) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cet article a déjà été vendu.' }) }
    }

    if (listing.is_active === false) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette annonce n\'est plus disponible.' }) }
    }

    // ── Ré-achat immédiat : on annule le pending ABANDONNÉ du MÊME acheteur pour CETTE annonce ──
    // Cas réel : l'acheteur ouvre le checkout (commande 'pending' créée) puis ferme la fenêtre sans payer
    // (ex. le vendeur a changé le prix). Sans ça, ce pending <1h le bloquait à tort (« déjà en cours
    // d'achat ») pendant 1h. Un pending = AUCUN paiement encaissé → l'annuler est SÛR. On ne touche QU'AUX
    // pending de CET acheteur (jamais ceux d'un autre, ni une commande payée). Filet de sécurité : si son
    // ancienne session Stripe était malgré tout réglée plus tard, stripe-webhook.js la détecte comme
    // paiement orphelin (commande annulée) et rembourse automatiquement l'acheteur.
    const { data: myStale } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .eq('status', 'pending')
      .select('id')
    if (myStale && myStale.length) {
      await supabase.from('escrow_codes').delete().in('order_id', myStale.map(o => o.id))
      console.log(`[checkout] ${myStale.length} pending abandonné(s) annulé(s) → ré-achat (buyer ${buyerId}, listing ${listingId})`)
    }

    // Vérification anti double-paiement — ignore les commandes pending > 1h (paiement abandonné)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('listing_id', listingId)
      .not('status', 'in', '("cancelled","refunded")')
      .or(`status.neq.pending,created_at.gte.${oneHourAgo}`)
      .maybeSingle()

    if (existingOrder) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cet article est déjà en cours d\'achat.' }) }
    }

    let prixArticle      = Number(listing.price)

    // OFFRE ACCEPTÉE : on paie au PRIX CONVENU. Validé SERVEUR (offre 'accepted' + bon acheteur + bonne
    // annonce) — le client ne peut JAMAIS imposer un prix arbitraire, seulement le montant d'une offre acceptée.
    if (offerId) {
      const { data: offer } = await supabase
        .from('offers')
        .select('id, amount, status, buyer_id, seller_id, listing_id')
        .eq('id', offerId)
        .single()
      // Sécurité anti-offre-forgée : l'offre doit être acceptée, appartenir à CET acheteur, pour CETTE
      // annonce, ET son vendeur doit être le VRAI propriétaire (sinon auto-acceptation buyer=seller=self).
      if (!offer || offer.status !== 'accepted'
          || offer.buyer_id !== buyerId || offer.listing_id !== listingId
          || offer.seller_id !== listing.user_id || offer.buyer_id === listing.user_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Offre invalide ou non acceptée.' }) }
      }
      prixArticle = Number(offer.amount)
    }

    // Garde-fou : pas de paiement en ligne sous 1 €. Un article à 0 € (« offert ») se récupère en
    // contactant le vendeur ; et un total < 0,50 € serait de toute façon refusé par Stripe. On bloque
    // AVANT de créer la commande/le code escrow pour ne pas laisser de commande orpheline.
    if (Number(prixArticle) < 1) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cet article ne s\'achète pas en ligne (offert ou prix sous 1 €). Contacte le vendeur pour organiser la remise.' }) }
    }
    // ── PLAFOND DE PAIEMENT EN LIGNE (filet INDÉPENDANT de la catégorie) ── : borne l'exposition NOUT
    // sur les gros montants (risque juridique « intermédiaire de paiement régulé » + gel Stripe). C'est
    // le vrai garde-fou contre une VOITURE mal catégorisée : le cap client (50 000 €) est contournable
    // par un insert brut, celui-ci est SERVEUR. Au-delà → remise/paiement en direct avec le vendeur.
    // Montant fixé par le user (21/07) : borne l'exposition NOUT par transaction, sans bloquer les ventes
    // légit haut de gamme. Le relever/baisser = 1 seule ligne ici.
    const MAX_ONLINE_PAYMENT_EUR = 10000
    if (Number(prixArticle) > MAX_ONLINE_PAYMENT_EUR) {
      return { statusCode: 400, headers, body: JSON.stringify({
        error: `Le paiement en ligne NOUT est plafonné à ${MAX_ONLINE_PAYMENT_EUR} €. Pour un montant supérieur, contacte le vendeur pour organiser la remise en direct.`,
        code: 'amount_too_high',
      }) }
    }
    // Modèle protection acheteur : total acheteur = prix + protection (10%+0,25€) + port + tampon frais
    // Stripe sur le port. Versement vendeur = le PRIX PLEIN (les frais sont payés par l'acheteur).
    // Le tampon (2 % du port) est INTÉGRÉ à la ligne « protection » (voir buyerProtection ci-dessous) :
    // il couvre le ~1,5 % que Stripe prélève sur le port, que la protection (calculée sur le prix) ne
    // couvrait pas. Le port stocké (shipping_fee) reste le VRAI tarif transporteur (sert au remboursement).
    const protectionFee  = computeProtectionFee(prixArticle)
    const port           = SHIPPING_FEES[optionId] ?? 0
    const shippingBuffer = computeShippingFeeBuffer(port)
    const buyerProtection = Math.round((protectionFee + shippingBuffer) * 100) / 100
    const totalAcheteur  = computeTotals(prixArticle, optionId)
    const sellerPayout   = computeSellerPayout(prixArticle)

    const siteUrl     = process.env.URL || 'http://localhost:8888'

    // Créer la commande en base
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      buyer_id:          buyerId,
      seller_id:         listing.user_id,
      listing_id:        listingId,
      total_price:       totalAcheteur,
      seller_payout:     sellerPayout,
      shipping_fee:      port,                 // port FIGÉ (sert au calcul de remboursement, stable dans le temps)
      shipping_method:   meta.genericMethod,   // 'hand'/'relay'/'home' — générique (compat affichage + logique existante)
      delivery_option:   optionId,             // option exacte ('ubn_relay'…) pour la création d'étiquette
      carrier:           meta.carrier,         // 'ubn' | 'chronopost' | null
      relay_id:          meta.isRelay ? relay : null,
      relay_label:       meta.isRelay ? relayLbl : null,
      // ubn-create-shipment.js lit ubn_pr_user_id → on le renseigne pour les relais UBN (compat).
      ubn_pr_user_id:    (meta.isRelay && meta.carrier === 'ubn') ? relay : null,
      shipping_phone:    isDelivery ? phone : null,
      shipping_address:  meta.isHome ? addr : null,
      shipping_city:     isDelivery ? cityShip : null,
      shipping_postcode: isDelivery ? postcode : null,
      status:            'pending',
    }).select().single()

    if (orderError || !order) {
      console.error('Order insert error:', orderError?.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la création de la commande.' }) }
    }

    // Code escrow à 6 chiffres : UNIQUEMENT pour la REMISE EN MAIN PROPRE (isDelivery === false).
    // En LIVRAISON (relais/domicile), il n'y a PAS de code : la réception est validée par le suivi
    // transporteur (cron chronopost-tracking → delivered → release-delivered verse à +48h). Générer un
    // code en livraison mélangeait les deux flux (l'acheteur validait le code → versement avant même
    // l'expédition → commande bloquée). On ne le crée donc qu'en main propre.
    let escrowCode = null
    if (!isDelivery) {
      escrowCode = String(randomInt(100000, 1000000))
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { error: escrowError } = await supabase.from('escrow_codes').insert({
        order_id:   order.id,
        code:       escrowCode,
        expires_at: expiresAt,
      })
      if (escrowError) {
        console.error('Escrow insert error:', escrowError.message)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la création du code de remise.' }) }
      }
    }

    // Créer la session Stripe Checkout — argent capturé sur le compte NOUT, pas de transfert vendeur
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Lignes détaillées pour que l'acheteur voie clairement le découpage sur la page Stripe.
      // La somme des lignes = total_price stocké sur la commande (prix + protection + port).
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name:   listing.title,
              images: listing.images?.slice(0, 1) ?? [],
            },
            unit_amount: Math.round(prixArticle * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'eur',
            // Protection acheteur (10 % + 0,25 €) + tampon frais Stripe sur le port. Libellé générique
            // car le tampon (nul en main propre) dépend du port choisi.
            product_data: { name: 'Frais de protection acheteur' },
            unit_amount: Math.round(buyerProtection * 100),
          },
          quantity: 1,
        },
        ...(port > 0 ? [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Livraison ${meta.isHome ? 'à domicile' : 'en point relais'}${meta.carrier ? ` (${meta.carrier === 'ubn' ? 'UBN' : 'Chronopost'})` : ''}`,
            },
            unit_amount: Math.round(port * 100),
          },
          quantity: 1,
        }] : []),
      ],
      payment_intent_data: {
        // Pas de transfer_data ni application_fee_amount : l'argent reste sur le compte Stripe NOUT.
        // Le transfert au vendeur sera déclenché manuellement à la confirmation du code escrow.
        metadata: { orderId: order.id, listingId },
      },
      metadata: { orderId: order.id, listingId },
      success_url: `${siteUrl}/paiement-succes?commande=${order.id}`,
      cancel_url:  `${siteUrl}/annonce/${listingId}`,
    })

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) }

  } catch (err) {
    console.error('Stripe error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors du paiement. Réessaie.' }) }
  }
}
