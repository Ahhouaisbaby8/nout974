import { supabase } from './supabase'

export const getConversations = async (userId) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, created_at, is_read,
      listing_id, listings(title, images),
      sender:profiles!sender_id(id, username, avatar_url),
      receiver:profiles!receiver_id(id, username, avatar_url)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getMessages = async (userId, otherUserId, listingId = null) => {
  let query = supabase
    .from('messages')
    .select(`*, sender:profiles!sender_id(id, username, avatar_url)`)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true })

  if (listingId) query = query.eq('listing_id', listingId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const sendMessage = async ({ senderId, receiverId, listingId = null, content }) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, listing_id: listingId ?? undefined, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export const markAsRead = async (messageIds) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .in('id', messageIds)
  if (error) throw error
}

export const subscribeToMessages = (userId, callback) =>
  supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`,
    }, callback)
    .subscribe()
