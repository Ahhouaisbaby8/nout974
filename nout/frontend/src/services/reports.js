import { supabase } from './supabase'

export const createReport = async ({ reporterId, listingId = null, userId = null, reason, details = '' }) => {
  // Vérifie qu'un signalement identique n'existe pas déjà
  let dupeQuery = supabase
    .from('reports')
    .select('id')
    .eq('reporter_id', reporterId)

  if (listingId) {
    dupeQuery = dupeQuery.eq('listing_id', listingId)
  } else if (userId) {
    dupeQuery = dupeQuery.eq('user_id', userId).is('listing_id', null)
  }

  const { data: existing } = await dupeQuery.maybeSingle()
  if (existing) return { alreadyReported: true }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      listing_id:  listingId,
      user_id:     userId,
      reason,
      details,
    })
  if (error) throw error
  return { alreadyReported: false }
}

// Utilisé par le panel admin (nécessite la policy SELECT admins dans Supabase)
export const getReports = async (filter = 'pending') => {
  let q = supabase
    .from('reports')
    .select(`
      id, reason, details, status, created_at, message_id, admin_note,
      reporter:profiles!reporter_id(id, username),
      listing:listings!listing_id(id, title),
      reported_profile:profiles!user_id(id, username)
    `)
    .order('created_at', { ascending: false })

  if (filter !== 'all') q = q.eq('status', filter)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export const updateReportStatus = async (id, status) => {
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export const updateAdminNote = async (id, note) => {
  const { error } = await supabase
    .from('reports')
    .update({ admin_note: note })
    .eq('id', id)
  if (error) throw error
}
