import { supabase } from './supabase'
import { validateImageFile } from '../utils/image'

export const getListings = async ({ category, subcategory, city, condition, brand, size, color, material, minPrice, maxPrice, search, sortBy = 'recent', page = 1, limit = 20 } = {}) => {
  let query = supabase
    .from('listings')
    .select(`*, profiles(id, username, avatar_url)`, { count: 'exact' })
    .eq('is_sold', false)
    .eq('is_active', true)
    .range((page - 1) * limit, page * limit - 1)

  if (category)  query = query.eq('category', category)
  // Filtre "souple" : dans une sous-catégorie, on montre les annonces de cette
  // sous-catégorie ET celles sans sous-catégorie (annonces anciennes) → rien ne disparaît.
  if (subcategory) query = query.or(`subcategory.eq.${subcategory},subcategory.is.null`)
  if (city)      query = query.eq('city', city)
  if (condition) query = query.eq('condition', condition)
  if (brand)     query = query.eq('brand', brand)
  if (size)      query = query.eq('size', size)
  if (color)     query = query.eq('color', color)
  if (material)  query = query.eq('material', material)
  if (minPrice)  query = query.gte('price', minPrice)
  if (maxPrice)  query = query.lte('price', maxPrice)
  // Recherche multi-champs : titre + marque + description (avant : titre seul).
  // On nettoie les caractères qui casseraient le filtre .or() de PostgREST (virgules / parenthèses).
  if (search) {
    const s = String(search).replace(/[,()]/g, ' ').trim()
    if (s) query = query.or(`title.ilike.%${s}%,brand.ilike.%${s}%,description.ilike.%${s}%`)
  }

  if (sortBy === 'price_asc')  query = query.order('price', { ascending: true })
  else if (sortBy === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  return query
}

export const getListingById = async (id) => {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, profiles(id, username, avatar_url, created_at, is_creator)`)
    .eq('id', id)
    .single()

  if (error) throw error

  await supabase.from('listings').update({ views: (data.views ?? 0) + 1 }).eq('id', id)

  return data
}

export const createListing = async (listing) => {
  const price = Number(listing.price)
  if (isNaN(price) || price < 0 || price > 50000) throw new Error('Prix invalide.')
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...listing, price })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateListing = async (id, updates) => {
  if ('price' in updates) {
    const price = Number(updates.price)
    if (isNaN(price) || price < 0 || price > 50000) throw new Error('Prix invalide.')
    updates = { ...updates, price }
  }
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Statuts de commande qui représentent une VENTE ACTIVE : on interdit alors de
// supprimer l'annonce (sinon on perdrait la trace d'une transaction en cours).
const ACTIVE_ORDER_STATUSES = ['paid', 'shipped', 'delivered', 'disputed', 'payout_pending']

export const deleteListing = async (id) => {
  // Garde-fou : refuser la suppression si une vente est en cours sur cette annonce.
  const { data: activeOrders, error: checkError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('listing_id', id)
    .in('status', ACTIVE_ORDER_STATUSES)
    .limit(1)
  if (checkError) throw checkError
  if (activeOrders && activeOrders.length > 0) {
    const err = new Error('Cette annonce a une vente en cours et ne peut pas être supprimée. Tu peux la marquer comme vendue.')
    err.code = 'ACTIVE_ORDER'
    throw err
  }

  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}

export const uploadListingImage = async (file, userId) => {
  // Sécurité : valide le TYPE MIME réel + la taille ; l'extension vient du type, jamais du nom client.
  const ext = validateImageFile(file)
  const rand = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
  const path = `${userId}/${Date.now()}-${rand}.${ext}`
  const { error } = await supabase.storage.from('listings')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`Upload photo échoué : ${error.message}`)
  return supabase.storage.from('listings').getPublicUrl(path).data.publicUrl
}

export const adminUpdateListing = async (id, updates) => {
  const { error } = await supabase.from('listings').update(updates).eq('id', id)
  if (error) throw error
}

export const getSimilarListings = async (category, excludeId, limit = 4) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*, profiles(id, username, avatar_url)')
    .eq('category', category)
    .eq('is_sold', false)
    .eq('is_active', true)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export const getUserListings = async (userId) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
