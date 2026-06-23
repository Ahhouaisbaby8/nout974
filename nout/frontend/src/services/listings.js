import { supabase } from './supabase'

export const getListings = async ({ category, city, condition, brand, minPrice, maxPrice, search, sortBy = 'recent', page = 1, limit = 20 } = {}) => {
  let query = supabase
    .from('listings')
    .select(`*, profiles(id, username, avatar_url)`, { count: 'exact' })
    .eq('is_sold', false)
    .eq('is_active', true)
    .range((page - 1) * limit, page * limit - 1)

  if (category)  query = query.eq('category', category)
  if (city)      query = query.eq('city', city)
  if (condition) query = query.eq('condition', condition)
  if (brand)     query = query.eq('brand', brand)
  if (minPrice)  query = query.gte('price', minPrice)
  if (maxPrice)  query = query.lte('price', maxPrice)
  if (search)    query = query.ilike('title', `%${search}%`)

  if (sortBy === 'price_asc')  query = query.order('price', { ascending: true })
  else if (sortBy === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  return query
}

export const getListingById = async (id) => {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, profiles(id, username, avatar_url, created_at)`)
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

export const deleteListing = async (id) => {
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}

export const uploadListingImage = async (file, userId) => {
  const name = file.name ?? 'image.jpg'
  const ext  = name.includes('.') ? name.split('.').pop() : 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('listings').upload(path, file)
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
