import { supabase } from './supabase'

export const getListings = async ({ category, city, minPrice, maxPrice, search, page = 1, limit = 20 } = {}) => {
  let query = supabase
    .from('listings')
    .select(`*, profiles(id, username, avatar_url)`, { count: 'exact' })
    .eq('is_sold', false)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (category) query = query.eq('category', category)
  if (city)     query = query.eq('city', city)
  if (minPrice) query = query.gte('price', minPrice)
  if (maxPrice) query = query.lte('price', maxPrice)
  if (search)   query = query.ilike('title', `%${search}%`)

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
  const { data, error } = await supabase
    .from('listings')
    .insert(listing)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateListing = async (id, updates) => {
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
  const ext  = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('listings').upload(path, file)
  if (error) throw error
  return supabase.storage.from('listings').getPublicUrl(path).data.publicUrl
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
