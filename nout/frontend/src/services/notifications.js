import { supabase } from './supabase'

// Liste les notifications d'un utilisateur (les plus récentes d'abord).
export const getNotifications = async (userId, limit = 30) => {
  if (!userId) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// Nombre de notifications non lues.
export const getUnreadCount = async (userId) => {
  if (!userId) return 0
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

// Marque une ou toutes les notifications comme lues.
export const markNotificationsRead = async (userId, ids = null) => {
  let q = supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
  if (ids) q = q.in('id', ids)
  else q = q.eq('is_read', false)
  const { error } = await q
  if (error) throw error
}

// Crée une notification (best-effort, ne bloque pas l'action appelante).
// Côté client : utilisé pour notifier autrui (ex : un follow). Les notifs critiques
// liées à l'argent (vente, escrow) sont créées côté Netlify avec le service_role.
export const createNotification = async ({ userId, type, title, body, link }) => {
  try {
    await supabase.from('notifications').insert({
      user_id: userId, type, title, body: body ?? null, link: link ?? null,
    })
  } catch { /* best-effort */ }
}

// Abonnement temps réel aux nouvelles notifications d'un utilisateur.
// callback() est appelé à chaque insertion ; renvoie une fonction de désabonnement.
export const subscribeToNotifications = (userId, callback) => {
  if (!userId) return () => {}
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      callback,
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
