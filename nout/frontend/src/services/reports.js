import { supabase } from './supabase'

export const createReport = async ({ reporterId, listingId = null, userId = null, reason, details = '' }) => {
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
}
