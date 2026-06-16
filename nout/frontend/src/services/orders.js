import { supabase } from './supabase'

export const getMyOrders = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      listing:listings(id, title, images, price),
      seller:profiles!seller_id(id, username, avatar_url),
      buyer:profiles!buyer_id(id, username, avatar_url)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

