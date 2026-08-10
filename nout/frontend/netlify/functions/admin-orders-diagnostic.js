// ─── DIAGNOSTIC COMMANDES (admin, lecture seule) ─────────────────────────────────────────────
// Répond à une question simple : « la page Commandes est-elle vraiment à jour ? »
// Lit DIRECTEMENT la base avec la SERVICE KEY (contourne la RLS → aucune commande ne peut être
// masquée par une règle d'affichage) et renvoie un état factuel :
//   - total de commandes en base
//   - répartition par statut
//   - date de la commande la PLUS RÉCENTE (created_at) + combien datent des 7 / 30 derniers jours
//   - les 20 dernières commandes (article, acheteur, vendeur, montant, statut, date)
//
// Ne modifie RIEN, ne touche pas à l'argent. Réservé admin (JWT + rôle 'admin').

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
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

  // Auth admin (JWT + rôle) — même contrôle que les autres fonctions admin.
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
  if (callerProfile?.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs.' }) }
  }

  // Filtre de statut optionnel (pour alimenter le tableau admin complet).
  let statusFilter = null
  try { statusFilter = (JSON.parse(event.body || '{}').status) || null } catch { /* défaut = tout */ }

  try {
    // Total exact (head + count → ne rapatrie aucune ligne)
    const { count: total, error: countErr } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
    if (countErr) throw new Error(countErr.message)

    // Répartition par statut : on lit les statuts (léger) et on agrège côté serveur.
    const { data: statusRows, error: stErr } = await supabase
      .from('orders')
      .select('status, created_at')
    if (stErr) throw new Error(stErr.message)

    const byStatus = {}
    let recent7 = 0, recent30 = 0
    const now = Date.now()
    const D7  = now - 7  * 24 * 60 * 60 * 1000
    const D30 = now - 30 * 24 * 60 * 60 * 1000
    for (const r of statusRows ?? []) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
      const t = new Date(r.created_at).getTime()
      if (t >= D7)  recent7++
      if (t >= D30) recent30++
    }

    // Liste COMPLÈTE des commandes (jusqu'à 200), triée du plus récent au plus ancien.
    // Passe par la service key → contourne la RLS : l'admin voit TOUTES les commandes (le bug
    // « il manque des lignes » venait de la lecture navigateur bridée par la RLS).
    let listQ = supabase
      .from('orders')
      .select(`id, total_price, status, created_at, delivered_at, shipped_at, seller_payout, package_stage,
        carrier, delivery_option, shipping_method,
        buyer:profiles!buyer_id(username),
        seller:profiles!seller_id(username),
        listings(title)`)
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(200)
    if (statusFilter && statusFilter !== 'all') listQ = listQ.eq('status', statusFilter)
    const { data: allOrders, error: listErr } = await listQ
    if (listErr) throw new Error(listErr.message)

    // Date limite avant annulation auto (escrow_codes.expires_at) pour les commandes affichées.
    // Une seule requête (in), indexée par order_id → le front affiche le temps restant.
    const orderIds = (allOrders ?? []).map(o => o.id)
    const expiryByOrder = {}
    if (orderIds.length) {
      const { data: escrows } = await supabase
        .from('escrow_codes')
        .select('order_id, expires_at, confirmed_at, refunded_at')
        .in('order_id', orderIds)
      for (const e of escrows ?? []) expiryByOrder[e.order_id] = e
    }

    const rows = (allOrders ?? []).map(o => ({
      id:           o.id,
      article:      o.listings?.title ?? '—',
      acheteur:     o.buyer?.username ?? '—',
      vendeur:      o.seller?.username ?? '—',
      montant:      o.total_price,
      statut:       o.status,
      date:         o.created_at,
      delivered_at: o.delivered_at ?? null,   // pour calculer le temps restant avant versement auto (48h)
      shipped_at:   o.shipped_at ?? null,      // date d'expédition (= « remis le… »)
      package_stage: o.package_stage ?? null,  // étape réelle du colis (not_handed/in_transit/at_relay/delivered)
      carrier:      o.carrier ?? null,          // 'ubn' | 'chronopost' | null (main propre)
      delivery_option: o.delivery_option ?? null, // ex. 'ubn_relay' (mode précis)
      shipping_method: o.shipping_method ?? null, // repli vieilles commandes (hand/relay/home)
      seller_payout: o.seller_payout ?? null,  // montant dû au vendeur
      expires_at:   expiryByOrder[o.id]?.expires_at ?? null,   // date limite avant annulation auto
    }))

    // Date de la plus récente : indépendante du filtre statut (donnée globale).
    const mostRecent = (statusRows ?? [])
      .map(r => r.created_at).filter(Boolean)
      .sort().slice(-1)[0] ?? null

    // Santé des tâches automatiques (crons) : dernière exécution de chacune. Prouve que NOUT
    // interroge bien les transporteurs et gère les délais/versements — ou signale un cron mort.
    // Si la table n'existe pas encore (migration pas passée), heartbeats reste vide (pas d'erreur).
    let heartbeats = []
    try {
      const { data: hb } = await supabase
        .from('cron_heartbeats')
        .select('job, last_run_at, last_summary')
      heartbeats = hb ?? []
    } catch { /* table absente = migration pas encore passée : on n'échoue pas pour autant */ }

    return { statusCode: 200, headers, body: JSON.stringify({
      total,
      mostRecent,          // date ISO de la commande la plus récente (null si base vide)
      recent7,             // nb de commandes des 7 derniers jours
      recent30,            // nb de commandes des 30 derniers jours
      byStatus,            // { paid: n, cancelled: n, ... }
      orders: rows,        // TOUTES les commandes (filtrées par statut si demandé), pour le tableau
      heartbeats,          // [{ job, last_run_at, last_summary }] — santé des crons
      generatedAt: new Date().toISOString(),
    }) }
  } catch (e) {
    console.error('admin-orders-diagnostic:', e.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lecture base : ' + e.message }) }
  }
}
