// ─── Création d'une expédition Chronopost (endpoint HTTP appelé par le vendeur) ───
//
// Wrapper HTTP autour de createLabel() (chronopost-create-label.js). Appelé par
// Orders.jsx quand le vendeur clique « Générer l'étiquette » sur une commande
// carrier='chronopost'. Génère l'étiquette (relais 4P ou domicile 17), stocke le
// suivi + l'étiquette, passe la commande en 'shipped' + shipped_at.
//
// Sécurité :
//  - JWT obligatoire ; seul le VENDEUR de la commande peut créer l'expédition.
//  - Les identifiants Chronopost ne quittent jamais le serveur (_chronopost-client.js).
//  - Idempotent : si un tracking Chronopost existe déjà, on ne recrée pas.
//
// EXPÉDITEUR = LE VENDEUR (lu depuis son profil : ship_address/postcode/city + phone).
// DESTINATAIRE = l'acheteur (relais → coordonnées du point relais ; domicile → adresse acheteur).

const { createClient } = require('@supabase/supabase-js')
const { createLabel } = require('./chronopost-create-label')
const { isChronopostConfigured, ChronopostError } = require('./_chronopost-client')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'
const SITE_URL       = process.env.URL || 'https://nout.re'

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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  if (!isChronopostConfigured()) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'La livraison Chronopost n\'est pas encore activée.' }) }
  }

  // JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { order_id, weight_kg } = JSON.parse(event.body || '{}')
    if (!order_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'order_id manquant.' }) }

    // Commande + destinataire (acheteur). L'adresse de livraison acheteur vit sur la commande.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, status, seller_id, buyer_id, total_price, carrier, delivery_option,
        relay_id, relay_label, chronopost_tracking_number, ubn_ref_commande,
        shipping_phone, shipping_address, shipping_city, shipping_postcode,
        listing:listings!listing_id(title, price),
        buyer:profiles!buyer_id(username, email)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }
    }
    if (order.seller_id !== authUser.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }
    if (!['paid', 'shipped'].includes(order.status)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'La commande doit être payée avant l\'expédition.' }) }
    }
    // ── GARDE TRANSPORTEUR (anti-abus vendeur) ──
    // Refuse une commande qui n'est pas une livraison Chronopost, et refuse une 2e étiquette si une
    // expédition UBN existe déjà (sinon NOUT paierait DEUX transporteurs pour un seul port encaissé).
    if (order.carrier && order.carrier !== 'chronopost') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette commande n\'est pas une livraison Chronopost.' }) }
    }
    if (order.ubn_ref_commande) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Une expédition UBN existe déjà pour cette commande.' }) }
    }
    // Idempotence : une étiquette Chronopost existe déjà → on ne recrée pas.
    if (order.chronopost_tracking_number) {
      return { statusCode: 200, headers, body: JSON.stringify({
        success: true, already: true, tracking: order.chronopost_tracking_number,
        message: 'Une étiquette Chronopost existe déjà pour cette commande.',
      }) }
    }

    // Mode : relais (4P) ou domicile (17), déduit de delivery_option.
    const mode = (order.delivery_option === 'chrono_home' || order.delivery_option === 'home') ? 'express' : 'relais'

    // EXPÉDITEUR = le VENDEUR. Lecture directe avec la SERVICE KEY (côté serveur,
    // contourne la RLS) — PAS via get_my_account (qui dépend de auth.uid()).
    const { data: sellerP } = await supabase
      .from('profiles')
      .select('username, city, phone, ship_address, ship_address2, ship_postcode, ship_city, email')
      .eq('id', authUser.id)
      .single()

    const shipAddress  = sellerP?.ship_address
    const shipPostcode = sellerP?.ship_postcode
    const shipCity     = sellerP?.ship_city || sellerP?.city
    const shipPhone    = sellerP?.phone
    if (!shipAddress || !shipPostcode || !shipCity || !shipPhone) {
      return { statusCode: 400, headers, body: JSON.stringify({
        error: 'Renseigne d\'abord ton adresse d\'expédition et ton téléphone dans Réglages.',
        code: 'seller_address_missing',
      }) }
    }
    const shipper = {
      nom:        (sellerP?.username || 'Vendeur').slice(0, 100),
      contact:    (sellerP?.username || 'Vendeur').slice(0, 100),
      adresse1:   shipAddress, adresse2: sellerP?.ship_address2 || '',
      codePostal: shipPostcode, ville: shipCity,
      email:      sellerP?.email || 'contact@nout.re',
      telephone:  shipPhone, civilite: 'M',
    }

    // DESTINATAIRE = l'acheteur.
    const recipient = {
      nom:        (order.buyer?.username || 'Client').slice(0, 100),
      adresse1:   order.shipping_address || '',
      codePostal: order.shipping_postcode || '',
      ville:      order.shipping_city || '',
      email:      order.buyer?.email || 'contact@nout.re',
      telephone:  order.shipping_phone || '',
    }

    // En mode relais, il faut le point relais choisi (relay_id générique).
    let relais = null
    if (mode === 'relais') {
      if (!order.relay_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Point relais non sélectionné pour cette commande.' }) }
      }
      // Coordonnées du point relais : le label stocké donne le nom ; l'adresse du relais
      // n'est pas re-fetchée ici (le HUB Chronopost route via idRelais + CP destinataire).
      relais = {
        id:         order.relay_id,
        nom:        (order.relay_label || 'Point Relais').slice(0, 100),
        adresse1:   order.shipping_address || order.relay_label || 'Point Relais',
        codePostal: order.shipping_postcode || recipient.codePostal,
        ville:      order.shipping_city || recipient.ville,
      }
    } else {
      // Domicile : l'adresse acheteur est obligatoire.
      if (!recipient.adresse1 || !recipient.ville) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Adresse de livraison de l\'acheteur incomplète.' }) }
      }
    }

    const poids = Math.min(30, Math.max(0.1, Number(weight_kg) || 1))

    // ── Génération de l'étiquette ──
    const label = await createLabel(mode, {
      shipper, recipient, relais,
      refCommande: `NOUT-${order.id}`.slice(0, 35),
      contenu:     'Second hand item',   // anglais (requis à l'international)
      poids,
    })

    if (!label.trackingNumber) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Chronopost n\'a pas renvoyé de numéro de suivi.' }) }
    }

    // Stocker le suivi + l'étiquette, passer en shipped.
    const updates = {
      carrier:                    'chronopost',
      chronopost_tracking_number: label.trackingNumber,
      chronopost_label_url:       label.labelBase64 ? `data:application/pdf;base64,${label.labelBase64}` : null,
      chronopost_status:          'DC', // « prêt chez l'expéditeur » à la création
      tracking_number:            label.trackingNumber, // champ générique (UI de suivi commune)
      shipped_at:                 new Date().toISOString(),
      status:                     'shipped',
    }
    const { error: updErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order_id)
      .in('status', ['paid', 'shipped']) // jamais écraser completed/refunded
    if (updErr) {
      console.error(`chronopost-create-shipment : update orders échoué (order ${order_id}):`, updErr.message)
    }

    // Prolonge le code escrow à expédition + 10 jours (même logique qu'UBN) : une livraison
    // lente ne doit pas faire expirer le code avant réception.
    const escrowExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('escrow_codes')
      .update({ expires_at: escrowExpiry })
      .eq('order_id', order_id)
      .is('confirmed_at', null)
      .is('refunded_at', null)

    // Notifier l'acheteur (best-effort).
    if (order.buyer_id) {
      fetch(`${SITE_URL}/.netlify/functions/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
        body: JSON.stringify({
          receiver_id: order.buyer_id,
          title: 'Ton colis est en route — NOUT 974',
          body:  `${order.listing?.title ?? 'Ton article'} a été expédié via Chronopost.`,
          url:   '/commandes?tab=achats',
        }),
      }).catch(err => console.error('chronopost-create-shipment send-push:', err.message))
    }

    return { statusCode: 200, headers, body: JSON.stringify({
      success: true,
      tracking: label.trackingNumber,
      label_url: updates.chronopost_label_url,
      isTest: label.isTest,
      message: 'Étiquette Chronopost générée.',
    }) }

  } catch (err) {
    const status = err instanceof ChronopostError ? err.status : 500
    const msg = err instanceof ChronopostError
      ? `Chronopost : ${err.message}`
      : 'Erreur serveur lors de la génération de l\'étiquette.'
    console.error('chronopost-create-shipment error:', err.code || '', err.message)
    return { statusCode: status, headers, body: JSON.stringify({ error: msg, code: err.code }) }
  }
}
