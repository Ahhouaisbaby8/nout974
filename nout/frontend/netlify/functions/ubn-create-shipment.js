// ─── Création d'une expédition UBN (POST signé HMAC) ─────────────────────────────
//
// Appelée quand une commande payée doit partir en livraison UBN. Construit le
// payload canonique (doc v4.5), l'envoie au HUB via /distant/shipments, puis stocke
// les références (ref_commande, tracking, statut bordereau) sur la commande.
//
// Sécurité :
//  - JWT obligatoire ; seul le VENDEUR de la commande peut créer l'expédition.
//  - La clé API ne quitte jamais le serveur (cf. _ubn-client.js).
//  - ref_commande unique → idempotence (le HUB rejette les doublons).

const { createClient } = require('@supabase/supabase-js')
const { ubnPost, isUbnConfigured, UbnError } = require('./_ubn-client')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Table ville → CP (974) imposée par le HUB. DOIT rester synchronisée avec src/utils/ubn.js.
const UBN_CITY_CP = {
  'Sainte-Marie': '97438', 'Saint-Denis': '97400', 'Sainte-Clotilde': '97490',
  'Saint-Pierre': '97410', 'Saint-Paul': '97460', 'Saint-Leu': '97436',
  'Le Port': '97420', 'La Possession': '97419', 'Saint-Benoît': '97470',
  'Bras-Panon': '97412', 'Saint-Louis': '97450', 'Le Tampon': '97430',
  'Saint-Joseph': '97480', 'Petite-Île': '97429', 'Étang-Salé': '97427',
  'Les Avirons': '97425',
}
const UBN_SERVICES = ['relais', 'economique', 'express', 'express_pro', 'samedi_express']

// Adresse expéditeur de repli (NOUT) — utilisée SEULEMENT si le vendeur n'a pas
// encore renseigné son adresse d'expédition. Sur une marketplace, l'expéditeur est
// normalement LE VENDEUR (c'est lui qui dépose le colis + reçoit les retours).
const fallbackShipper = () => ({
  company: process.env.UBN_SHIPPER_COMPANY || 'NOUT',
  name:    process.env.UBN_SHIPPER_NAME    || 'NOUT',
  cp:      process.env.UBN_SHIPPER_CP      || '97490',
  ville:   process.env.UBN_SHIPPER_VILLE   || 'Sainte-Clotilde',
  address: process.env.UBN_SHIPPER_ADDRESS || 'La Réunion',
  phone:   process.env.UBN_SHIPPER_PHONE   || '',
  email:   process.env.UBN_SHIPPER_EMAIL   || 'contact@nout.re',
})

// Construit l'expéditeur = le VENDEUR à partir de son profil (adresse d'expédition +
// téléphone). Lecture directe avec la SERVICE KEY (côté serveur, contourne la RLS) —
// PAS via get_my_account (qui dépend de auth.uid(), absent avec la service key).
// Repli sur NOUT si l'adresse vendeur est incomplète.
async function sellerShipper(sellerId) {
  const { data: s } = await supabase
    .from('profiles')
    .select('username, city, phone, ship_address, ship_address2, ship_postcode, ship_city, email')
    .eq('id', sellerId)
    .single()
  const shipCity = s?.ship_city || s?.city
  if (s?.ship_address && s?.ship_postcode && shipCity && s?.phone) {
    return {
      company: (s.username || 'Vendeur').slice(0, 60),
      name:    (s.username || 'Vendeur').slice(0, 60),
      cp:      s.ship_postcode,
      ville:   shipCity,
      address: [s.ship_address, s.ship_address2].filter(Boolean).join(' ').slice(0, 100),
      phone:   s.phone,
      email:   s.email || 'contact@nout.re',
    }
  }
  return fallbackShipper()
}

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

  if (!isUbnConfigured()) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'La livraison UBN n\'est pas encore activée.' }) }
  }

  // JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { order_id, weight_kg } = JSON.parse(event.body)
    if (!order_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres manquants.' }) }
    }

    // Charger la commande + destinataire (acheteur)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, status, seller_id, buyer_id, total_price, ubn_ref_commande,
        carrier, delivery_option, relay_id, relay_label, ubn_pr_user_id, chronopost_tracking_number,
        shipping_phone, shipping_address, shipping_city, shipping_postcode,
        listing:listings!listing_id(title, price),
        buyer:profiles!buyer_id(username, email)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }
    }

    // Seul le vendeur de la commande peut créer l'expédition
    if (order.seller_id !== authUser.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    // La commande doit être payée
    if (!['paid', 'shipped'].includes(order.status)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'La commande doit être payée avant l\'expédition.' }) }
    }

    // ── GARDE TRANSPORTEUR (anti-abus vendeur) ──
    // Le SERVICE et le POINT RELAIS sont DÉRIVÉS DE LA COMMANDE, jamais du body : sinon un vendeur pourrait
    // choisir un service plus cher (facturé au contrat UBN de NOUT) ou rediriger le colis vers un autre relais
    // que celui payé par l'acheteur. On refuse aussi une commande qui n'est pas une livraison UBN, et le
    // croisement (déjà expédiée via Chronopost) pour ne jamais payer deux transporteurs pour un seul port.
    if (order.carrier && order.carrier !== 'ubn') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette commande n\'est pas une livraison UBN.' }) }
    }
    if (order.chronopost_tracking_number) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Une étiquette Chronopost existe déjà pour cette commande.' }) }
    }
    const OPTION_TO_UBN_SERVICE = { ubn_relay: 'relais', ubn_home: 'economique' }
    const service = OPTION_TO_UBN_SERVICE[order.delivery_option]
    if (!service) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Option de livraison UBN inconnue pour cette commande.' }) }
    }
    const relayId = order.ubn_pr_user_id || order.relay_id
    if (service === 'relais' && !relayId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Point relais non sélectionné pour cette commande.' }) }
    }

    // Idempotence : si une expédition existe déjà pour cette commande, on ne recrée pas
    if (order.ubn_ref_commande) {
      return { statusCode: 200, headers, body: JSON.stringify({
        success: true, already: true, ref_commande: order.ubn_ref_commande,
        message: 'Une expédition UBN existe déjà pour cette commande.',
      }) }
    }

    // Adresse destinataire : pour relais, l'adresse client n'est pas exigée (relais choisi).
    // Pour domicile, on exige une adresse valide avec couple ville/CP conforme.
    const city = (order.shipping_city || '').trim()
    let cp = (order.shipping_postcode || '').trim()
    if (service !== 'relais') {
      if (!order.shipping_address || !city) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Adresse de livraison incomplète.' }) }
      }
      // Le HUB refuse les couples ville/CP non conformes → on impose le CP officiel si connu
      if (UBN_CITY_CP[city]) cp = UBN_CITY_CP[city]
      else if (!cp) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ville de livraison non desservie par UBN.' }) }
      }
    }

    // Référence unique de commande pour le HUB (anti-doublon)
    const refCommande = `NOUT-${order.id}`

    const buyerName = (order.buyer?.username || 'Client').slice(0, 60)
    const s = await sellerShipper(order.seller_id)

    // Poids : par défaut 1 kg si non précisé (vêtements légers), borné à 30 kg/ligne
    const weight = Math.min(30, Math.max(0.1, Number(weight_kg) || 1))

    // ── Payload canonique (doc v4.5, page 3) ──
    const payload = {
      id_api_connect:     Number(process.env.UBN_API_CONNECT_ID) || undefined,
      ubn_sr_source_site: process.env.UBN_SOURCE_SITE || process.env.URL || 'https://nout.re',
      ref_commande:       refCommande,
      service_id:         service,

      // Expéditeur (NOUT / vendeur)
      wpcargo_shipper_company_name: s.company,
      wpcargo_shipper_name:         s.name,
      wpcargo_shipper_firstname:    '',
      wpcargo_shipper_addressp:     'La Réunion',
      wpcargo_shipper_addresscp:    s.cp,
      wpcargo_shipper_addressv:     s.ville,
      wpcargo_shipper_address:      s.address,
      wpcargo_shipper_phone:        s.phone,
      wpcargo_shipper_email:        s.email,

      // Destinataire (acheteur)
      wpcargo_receiver_company_name: '',
      wpcargo_receiver_name:         buyerName,
      wpcargo_receiver_firstname:    '',
      wpcargo_receiver_addressp:     'La Réunion',
      wpcargo_receiver_addresscp:    cp || '',
      wpcargo_receiver_addressv:     city || '',
      wpcargo_receiver_address:      service === 'relais' ? '' : (order.shipping_address || ''),
      wpcargo_receiver_phone:        order.shipping_phone || '',
      wpcargo_receiver_email:        order.buyer?.email || '',

      items: [{
        qty: 1,
        type: 'Colis',
        description: (order.listing?.title || 'Article').slice(0, 120),
        weight,
        length: 0, width: 0, height: 0, sum_dimensions: 0,
        value: Math.round(Number(order.listing?.price ?? order.total_price) || 0),
      }],
    }

    // Point relais : on envoie seulement l'id canonique (issu de la COMMANDE), le HUB hydrate le reste
    if (service === 'relais') payload.ubn_pr_user_id = String(relayId)

    // ── Appel signé HUB ──
    const result = await ubnPost('/shipments', payload)

    const trackingNumber = result.tracking || result.tracking_number || null

    // Stocker les références retournées sur la commande.
    // On remplit AUSSI tracking_number (champ standard) pour réutiliser l'UI de suivi
    // existante (identique au flux Chronopost), et shipped_at pour cohérence.
    const updates = {
      carrier:              'ubn',
      ubn_service:          service,
      ubn_ref_commande:     refCommande,
      ubn_tracking_number:  trackingNumber,
      ubn_tracking_url:     result.tracking_url || null,
      ubn_bordereau_status: result.bordereau_status || 'pending',
      ubn_pr_user_id:       service === 'relais' ? String(relayId) : null,
      ubn_pr_label:         service === 'relais' ? (order.relay_label || null) : null,
      tracking_number:      trackingNumber || `UBN-${refCommande}`,
      shipped_at:           new Date().toISOString(),
      status:               'shipped',
    }
    // Garde idempotente : on ne passe à shipped que depuis paid/shipped (jamais écraser
    // completed/refunded). Si une autre requête a déjà bougé le statut, .eq filtre.
    const { error: updErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order_id)
      .in('status', ['paid', 'shipped'])
    if (updErr) {
      // L'expédition est créée côté UBN ; on log mais on ne perd pas l'info pour l'utilisateur
      console.error(`ubn-create-shipment : update orders échoué (order ${order_id}):`, updErr.message)
    }

    // Prolonge le code escrow à expédition + 10 jours (même logique que update-order-shipping.js) :
    // sans ça, une livraison lente ferait expirer le code avant réception → argent bloqué.
    // On ne touche jamais un code déjà confirmé ou remboursé.
    const escrowExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const { error: escrowExtendErr } = await supabase
      .from('escrow_codes')
      .update({ expires_at: escrowExpiry })
      .eq('order_id', order_id)
      .is('confirmed_at', null)
      .is('refunded_at', null)
    if (escrowExtendErr) {
      console.error(`ubn-create-shipment : escrow extend échoué (order ${order_id}):`, escrowExtendErr.message)
    }

    // Notifier l'acheteur que son colis part (best-effort, comme le flux Chronopost)
    if (order.buyer_id) {
      fetch(`${process.env.URL || 'https://nout.re'}/.netlify/functions/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
        body: JSON.stringify({
          receiver_id: order.buyer_id,
          title:       '📦 Ton colis est en route — NOUT 974',
          body:        `${order.listing?.title ?? 'Ton article'} a été expédié via UBN.`,
          url:         '/commandes?tab=achats',
        }),
      }).catch(err => console.error('ubn-create-shipment send-push:', err.message))
    }

    return { statusCode: 200, headers, body: JSON.stringify({
      success: true,
      ref_commande: refCommande,
      tracking: trackingNumber,
      tracking_url: updates.ubn_tracking_url,
      message: 'Expédition UBN créée.',
    }) }

  } catch (err) {
    if (err instanceof UbnError) {
      console.error('ubn-create-shipment UbnError:', err.code, err.message)
      // Message lisible selon les codes d'erreur fréquents de la doc
      const friendly = {
        city_postcode_mismatch: 'La ville et le code postal ne correspondent pas (livraison UBN).',
        invalid_service:        'Service de livraison UBN invalide.',
        duplicate_ref_commande: 'Une expédition existe déjà pour cette commande.',
        missing_api_key:        'Configuration UBN incomplète.',
        invalid_signature:      'Erreur d\'authentification UBN.',
      }[err.code] || 'Impossible de créer l\'expédition UBN. Réessaie plus tard.'
      return { statusCode: err.status, headers, body: JSON.stringify({ error: friendly, code: err.code }) }
    }
    console.error('ubn-create-shipment error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur lors de l\'expédition.' }) }
  }
}
