import { supabase } from './supabase'

// ─── NOUT Pro : lecture/écriture des boutiques ─────────────────────────────────────
// Une boutique = une ligne `shops` (marque, thème, réglages de présentation en JSON)
// + des `listings` portant son `shop_id`. Aucun code argent ici : un produit de
// boutique est un listing ordinaire, il passe par le MÊME tunnel de paiement.
//
// ⚠️ Tant que la migration `20260806_shops.sql` n'a pas été exécutée, la table n'existe
// pas : PostgREST répond alors une erreur de schéma. On la traduit en un message clair
// (`SHOPS_TABLE_MISSING`) au lieu de laisser une erreur brute remonter à l'écran.

export const SHOPS_TABLE_MISSING = 'SHOPS_TABLE_MISSING'

// Codes PostgREST/Postgres quand la table ou une colonne n'existe pas encore
const MISSING = new Set(['42P01', '42703', 'PGRST205', 'PGRST204'])
const wrap = (error) => {
  if (!error) return null
  const e = new Error(MISSING.has(error.code) ? SHOPS_TABLE_MISSING : (error.message || 'Erreur boutique'))
  e.code = error.code
  e.missing = MISSING.has(error.code)
  return e
}

// Boutique publique par son adresse (nout.re/<slug>). `null` si inconnue ou en brouillon
// (les politiques RLS renvoient déjà les brouillons du seul propriétaire).
export const getShopBySlug = async (slug) => {
  if (!slug) return null
  const { data, error } = await supabase
    .from('shops').select('*').ilike('slug', slug).maybeSingle()
  if (error) throw wrap(error)
  return data || null
}

// Les boutiques du vendeur connecté (brouillons compris). Deux au maximum par défaut.
export const getMyShops = async (ownerId) => {
  if (!ownerId) return []
  const { data, error } = await supabase
    .from('shops').select('*').eq('owner_id', ownerId).order('created_at', { ascending: true })
  if (error) throw wrap(error)
  return data ?? []
}
export const getMyShop = async (ownerId) => (await getMyShops(ownerId))[0] || null

// Quota du compte : 2 par défaut, relevé au cas par cas par le support.
export const DEFAULT_SHOP_QUOTA = 2
export const getShopQuota = async (ownerId) => {
  if (!ownerId) return DEFAULT_SHOP_QUOTA
  const { data, error } = await supabase
    .from('profiles').select('shop_quota').eq('id', ownerId).maybeSingle()
  if (error) { if (MISSING.has(error.code)) return DEFAULT_SHOP_QUOTA; throw wrap(error) }
  return data?.shop_quota ?? DEFAULT_SHOP_QUOTA
}

// L'adresse est-elle libre ? (la base tranche vraiment, via son index unique)
export const isSlugFree = async (slug, exceptId = null) => {
  if (!slug) return false
  let q = supabase.from('shops').select('id').ilike('slug', slug)
  if (exceptId) q = q.neq('id', exceptId)
  const { data, error } = await q.maybeSingle()
  if (error) throw wrap(error)
  return !data
}

// Champs acceptés en écriture. Tout ce qui touche à la présentation part dans
// `settings` : l'éditeur bouge trop vite pour une colonne par réglage.
const shopRow = (s) => ({
  slug: s.slug,
  name: s.name,
  tagline: s.tagline ?? null,
  description: s.description ?? null,
  logo_url: s.logo_url ?? null,
  accent_color: s.accent_color ?? null,
  font_key: s.font_key || 'montserrat',
  template_key: s.template_key || 'epuree',
  sector: s.sector ?? null,
  mode: s.mode || 'escrow',
  settings: s.settings || {},
})

export const createShop = async (ownerId, shop) => {
  if (!ownerId) throw new Error('Connexion requise')
  const { data, error } = await supabase
    .from('shops').insert({ owner_id: ownerId, ...shopRow(shop) }).select().single()
  if (error) {
    // le quota est refusé par la base : on traduit son message technique
    if (/SHOP_QUOTA_REACHED/.test(error.message || '')) {
      const e = new Error(`Tu as déjà atteint le nombre de boutiques autorisé sur ce compte (${DEFAULT_SHOP_QUOTA}). `
        + "Écris au support depuis l'aide si ton activité en demande davantage : on relève la limite au cas par cas.")
      e.code = 'SHOP_QUOTA_REACHED'
      throw e
    }
    throw wrap(error)
  }
  return data
}

export const updateShop = async (shopId, shop) => {
  const { data, error } = await supabase
    .from('shops').update(shopRow(shop)).eq('id', shopId).select().single()
  if (error) throw wrap(error)
  return data
}

// Publication : c'est ici que le SIRET devient obligatoire. La base porte la même règle
// (contrainte `shops_active_needs_siret`) — le front n'est pas la source de vérité.
export const publishShop = async (shopId, siret) => {
  const clean = String(siret || '').replace(/\s/g, '')
  if (!/^[0-9]{14}$/.test(clean)) throw new Error('Le SIRET doit comporter 14 chiffres.')
  const { data, error } = await supabase
    .from('shops').update({ siret: clean, is_active: true }).eq('id', shopId).select().single()
  if (error) throw wrap(error)
  return data
}

export const unpublishShop = async (shopId) => {
  const { error } = await supabase.from('shops').update({ is_active: false }).eq('id', shopId)
  if (error) throw wrap(error)
}

// Les produits d'une boutique = ses listings, dans l'ordre de la vitrine.
export const getShopListings = async (shopId) => {
  if (!shopId) return []
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price, images, shop_rayon, city, created_at, is_sold, description, condition')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
  if (error) throw wrap(error)
  // la vitrine parle de « rayon » ; en base c'est `shop_rayon` (le rayon du vendeur,
  // à ne pas confondre avec la catégorie du marketplace)
  return (data ?? []).map((l) => ({ ...l, rayon: l.shop_rayon }))
}

// Le wizard raisonne en neuf/occasion (la seule distinction qui change les garanties
// légales) ; la base garde le vocabulaire du marketplace, plus fin.
export const CONDITION_OF = { neuf: 'neuf_avec_etiquette', occasion: 'bon_etat' }
export const isNewGoods = (condition) => String(condition || 'neuf').startsWith('neuf')
