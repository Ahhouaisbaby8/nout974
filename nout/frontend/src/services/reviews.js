import { supabase } from './supabase'

export const getSellerReviews = async (sellerId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, buyer:profiles!reviewer_id(id, username, avatar_url)`)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createReview = async ({ buyerId, sellerId, orderId, rating, comment }) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ reviewer_id: buyerId, seller_id: sellerId, order_id: orderId, rating, comment })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getSellerRating = async (sellerId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('seller_id', sellerId)
  if (error) throw error
  const count = data?.length ?? 0
  const average = count > 0
    ? Math.round((data.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : 0
  return { average, count }
}

export const hasReviewed = async (buyerId, orderId) => {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('reviewer_id', buyerId)
    .eq('order_id', orderId)
    .maybeSingle()
  return !!data
}
