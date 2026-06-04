import { supabase } from './supabase'

export const getSellerReviews = async (sellerId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, buyer:profiles!reviews_buyer_id_fkey(id, username, avatar_url)`)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createReview = async ({ buyerId, sellerId, orderId, rating, comment }) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ buyer_id: buyerId, seller_id: sellerId, order_id: orderId, rating, comment })
    .select()
    .single()
  if (error) throw error
  return data
}

export const hasReviewed = async (buyerId, orderId) => {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('order_id', orderId)
    .maybeSingle()
  return !!data
}
