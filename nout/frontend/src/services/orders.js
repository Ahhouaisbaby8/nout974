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

export const createOrder = async (order) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOrderStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
