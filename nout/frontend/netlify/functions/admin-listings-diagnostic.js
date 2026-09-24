// ─── LISTE DES ANNONCES (admin, lecture seule) ───────────────────────────────────────────────
// La modération admin lisait les annonces DEPUIS LE NAVIGATEUR → la RLS des listings
// (« select using is_active = true OR owner_id = auth.uid() ») masquait toute annonce DÉSACTIVÉE
// d'un AUTRE vendeur → l'onglet « Inactives » restait vide (bug identique à celui de la page
// Commandes). On lit donc ici avec la SERVICE KEY (contourne la RLS) → l'admin voit TOUT.
//
// Ne modifie RIEN. Réservé admin (JWT + rôle 'admin'). Filtre : all | active | inactive | sold.

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

  // Filtre : all (défaut) | active | inactive | sold
  let filter = 'all'
  try { filter = (JSON.parse(event.body || '{}').filter) || 'all' } catch { /* défaut */ }

  try {
    let q = supabase.from('listings')
      .select('id, title, price, category, city, is_active, is_sold, created_at, images, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter === 'active')   q = q.eq('is_active', true).eq('is_sold', false)
    if (filter === 'inactive') q = q.eq('is_active', false)
    if (filter === 'sold')     q = q.eq('is_sold', true)

    const { data, error } = await q
    if (error) throw new Error(error.message)

    return { statusCode: 200, headers, body: JSON.stringify({ listings: data ?? [] }) }
  } catch (e) {
    console.error('admin-listings-diagnostic:', e.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur : ' + e.message }) }
  }
}
