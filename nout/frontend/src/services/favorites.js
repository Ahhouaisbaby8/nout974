import { supabase } from './supabase'

export const getFavorites = async (userId) => {
  const { data, error } = await supabase
    .from('favorites')
    .select(`*, listing:listings(*, profiles(username, avatar_url))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const addFavorite = async (userId, listingId) => {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, listing_id: listingId })
  if (error) throw error
}

export const removeFavorite = async (userId, listingId) => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
  if (error) throw error
}

export const isFavorite = async (userId, listingId) => {
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .single()
  return !!data
}
