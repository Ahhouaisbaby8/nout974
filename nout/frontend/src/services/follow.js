import { supabase } from './supabase'
import { createNotification } from './notifications'

// S'abonner à un vendeur. Notifie le vendeur (centre de notifs + push best-effort).
// followerName = pseudo de celui qui s'abonne (pour la notif).
export const followUser = async (followerId, followingId, followerName) => {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })
  if (error) throw error

  // Notification dans le centre de notifs du vendeur (best-effort)
  createNotification({
    userId: followingId,
    type:   'follow',
    title:  'Nouvel abonné',
    body:   `${followerName ?? 'Quelqu’un'} s’est abonné à votre profil`,
    link:   `/profil/${followerId}`,
  })

  // Notification push best-effort (pas de blocage si échec)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.access_token) return
    fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        receiver_id: followingId,
        title: 'Nouvel abonné',
        body: `${followerName ?? 'Quelqu’un'} s’est abonné à votre profil`,
        url: `/profil/${followerId}`,
      }),
    }).catch(() => {})
  }).catch(() => {})
}

// Se désabonner d'un vendeur
export const unfollowUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  if (error) throw error
}

// Est-ce que followerId est abonné à followingId ?
export const isFollowing = async (followerId, followingId) => {
  if (!followerId || !followingId) return false
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  return !!data
}

// Compteurs d'un profil : { followers, following }
//   followers = nombre de personnes abonnées à ce profil
//   following = nombre de profils auxquels ce profil est abonné
export const getFollowCounts = async (userId) => {
  if (!userId) return { followers: 0, following: 0 }
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  }
}
