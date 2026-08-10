// ─── Enquête sur UNE commande (admin, lecture seule) ─────────────────────────────────────────
// Recoupe la BASE et STRIPE pour dire la vérité sur une commande : statut, dates, et surtout
// l'argent — le vendeur a-t-il RÉELLEMENT été payé (transfert Stripe vers son compte connecté) ?
// L'acheteur a-t-il été remboursé ? Sert à diagnostiquer un cas suspect (ex. « expédié » sans dépôt,
// versement inattendu). Ne modifie RIEN. Réservé admin (JWT + rôle).

const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')
const { computeRefundAmount } = require('./_fees')
const { STAGE_LABEL } = require('./_carrier-stage')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const CORS_ORIGIN = process.env.URL || 'https://nout.re'
const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
  if (prof?.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs.' }) }

  let query = ''
  try { query = (JSON.parse(event.body || '{}').query || '').trim() } catch { /* */ }
  if (!query) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Indique un id de commande ou un titre d\'article.' }) }

  try {
    // Retrouver la commande : par id exact, sinon par titre d'article (ilike).
    let order = null
    const byId = await supabase
      .from('orders')
      .select(`*, listing:listings!listing_id(title), buyer:profiles!buyer_id(username, email), seller:profiles!seller_id(username, email, stripe_account_id)`)
      .eq('id', query).maybeSingle()
    order = byId.data
    if (!order) {
      const { data: list } = await supabase
        .from('orders')
        .select(`*, listing:listings!listing_id(title), buyer:profiles!buyer_id(username, email), seller:profiles!seller_id(username, email, stripe_account_id)`)
        .order('created_at', { ascending: false }).limit(200)
      order = (list ?? []).find(o => (o.listing?.title || '').toLowerCase().includes(query.toLowerCase())) || null
    }
    if (!order) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }

    // ── Vérité Stripe sur l'ARGENT ──
    const money = { paymentStatus: null, refunded: false, refundedAmount: 0, sellerTransferred: false, transfers: [] }

    // 1) Le paiement acheteur (PaymentIntent) : payé ? remboursé ? avec DÉTAIL des frais.
    if (order.stripe_payment_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_id, {
          expand: ['latest_charge.balance_transaction', 'latest_charge.refunds'],
        })
        money.paymentStatus = pi.status
        const charge = pi.latest_charge
        if (charge && typeof charge === 'object') {
          money.refunded = charge.refunded || (charge.amount_refunded ?? 0) > 0
          money.refundedAmount = (charge.amount_refunded ?? 0) / 100
          // Frais Stripe prélevés À L'ACHAT (non rendus au remboursement — coût inhérent).
          const bt = charge.balance_transaction
          if (bt && typeof bt === 'object') money.stripeFee = (bt.fee ?? 0) / 100
          // Date du remboursement (le plus récent).
          const refunds = charge.refunds?.data || []
          if (refunds.length) {
            const last = refunds[refunds.length - 1]
            money.refundedAt = new Date(last.created * 1000).toISOString()
          }
        }
      } catch (e) { money.paymentError = e.message }
    }

    // Détail « qui récupère quoi » sur le remboursement (modèle NOUT : acheteur = prix + port,
    // NOUT garde la protection ; frais Stripe initiaux non rendus par Stripe).
    if (money.refunded) {
      const info = computeRefundAmount(order)
      money.refundDetail = {
        rendu: info.amountCents / 100,               // prix + port rendus à l'acheteur
        protectionGardee: info.keptProtection,        // ce que NOUT garde
        fraisStripePerdus: money.stripeFee ?? null,   // frais Stripe de l'achat, non rendus
      }
    }

    // 2) Le VENDEUR a-t-il reçu un transfert ? (transfer_group = order_<id>)
    //    C'est LA question clé : un transfert existe = le vendeur a été payé pour cette commande.
    try {
      const list = await stripe.transfers.list({ transfer_group: `order_${order.id}`, limit: 10 })
      money.transfers = (list.data || []).map(t => ({
        id: t.id,
        montant: t.amount / 100,
        destination: t.destination,   // acct_... du vendeur
        reversed: (t.amount_reversed ?? 0) > 0,
        created: new Date(t.created * 1000).toISOString(),
      }))
      money.sellerTransferred = money.transfers.some(t => !t.reversed)
    } catch (e) { money.transferError = e.message }

    // Diagnostic lisible
    const flags = []
    if (order.status === 'shipped' && !order.delivered_at) {
      // Le flag dépend de l'ÉTAPE réelle du colis (renseignée par le suivi transporteur) : on ne dit
      // plus « pas déposé » pour un colis qui est en fait en route ou déjà au relais.
      if (order.package_stage === 'at_relay')
        flags.push('Colis À RETIRER au point relais : le transporteur l\'a livré au relais, l\'acheteur doit aller le chercher (ce n\'est PAS un colis perdu).')
      else if (order.package_stage === 'in_transit')
        flags.push('Colis EN ROUTE : pris en charge par le transporteur, en cours d\'acheminement (livraison non encore confirmée).')
      else
        flags.push('Colis PAS ENCORE PRIS EN CHARGE par le transporteur (étiquette générée mais aucun scan) — colis peut-être jamais déposé. Remboursement auto au bout de 14 j.')
    }
    if (money.sellerTransferred && order.status !== 'completed' && order.status !== 'payout_pending')
      flags.push('⚠ ANORMAL : un transfert vendeur existe alors que la commande n\'est pas finalisée.')
    if (money.sellerTransferred && !order.delivered_at)
      flags.push('⚠ ANORMAL : le vendeur a été payé alors que la livraison n\'est pas confirmée.')

    return { statusCode: 200, headers, body: JSON.stringify({
      commande: {
        id: order.id,
        article: order.listing?.title ?? null,
        acheteur: order.buyer?.username ?? null,
        vendeur: order.seller?.username ?? null,
        vendeur_a_un_compte_stripe: Boolean(order.seller?.stripe_account_id),
        statut: order.status,
        montant_acheteur: order.total_price,
        montant_du_au_vendeur: order.seller_payout,
        transporteur: order.carrier,
        numero_suivi: order.tracking_number || order.ubn_tracking_number || order.chronopost_tracking_number || null,
        cree_le: order.created_at,
        expedie_le: order.shipped_at,
        livre_le: order.delivered_at,
        etape_colis: order.package_stage || null,
        etape_colis_libelle: order.package_stage
          ? (STAGE_LABEL[order.package_stage] || order.package_stage)
          : (order.status === 'shipped' ? 'Pas encore de scan transporteur' : null),
      },
      argent: money,
      alertes: flags,
    }) }
  } catch (e) {
    console.error('admin-order-inspect:', e.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur : ' + e.message }) }
  }
}
