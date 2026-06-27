import { supabase } from './supabase'
import { createNotification } from './notifications'

export const getConversations = async (userId) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, created_at, is_read, sender_id, receiver_id,
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

export const sendMessage = async ({ senderId, receiverId, listingId = null, content, senderName = 'NOUT' }) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, listing_id: listingId ?? undefined, content })
    .select()
    .single()
  if (error) throw error

  // Notification dans le centre de notifs du destinataire (best-effort)
  createNotification({
    userId: receiverId,
    type:   'message',
    title:  `Message de ${senderName}`,
    body:   content.length > 80 ? content.slice(0, 80) + '…' : content,
    link:   `/messages/${senderId}`,
  })

  // Notification push best-effort (pas de blocage si échec)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.access_token) return
    fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        receiver_id: receiverId,
        title: senderName,
        body: content.length > 80 ? content.slice(0, 80) + '…' : content,
        url: `/messages/${senderId}`,
      }),
    }).catch(() => {})
  }).catch(() => {})

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
    .channel(`conv-recv-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`,
    }, callback)
    .subscribe()
