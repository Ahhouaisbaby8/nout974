import { supabase } from './supabase'

// Bloquer un membre. SILENCIEUX : aucune notification au bloqué (contrairement
// aux abonnements). L'effet (plus de messages/offres) est appliqué côté serveur
// par les RLS via la fonction is_blocked_with().
export const blockUser = async (blockerId, blockedId) => {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId })
  // 23505 = doublon (déjà bloqué) → on considère l'opération idempotente.
  if (error && error.code !== '23505') throw error
}

// Débloquer un membre.
export const unblockUser = async (blockerId, blockedId) => {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

// blockerId a-t-il bloqué blockedId ? (la RLS n'autorise la lecture qu'au bloqueur)
export const isBlocked = async (blockerId, blockedId) => {
  if (!blockerId || !blockedId) return false
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle()
  return !!data
}

// Liste des membres bloqués par blockerId (pour la page de gestion).
export const getBlockedProfiles = async (blockerId) => {
  if (!blockerId) return []
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, profile:blocked_id ( id, username, avatar_url, city )')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(b => ({
    id:         b.blocked_id,
    blockedAt:  b.created_at,
    username:   b.profile?.username,
    avatar_url: b.profile?.avatar_url,
    city:       b.profile?.city,
  }))
}
