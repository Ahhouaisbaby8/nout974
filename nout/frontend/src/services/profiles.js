import { supabase } from './supabase'

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// Profil public : champs affichables uniquement — sans IBAN, téléphone, stripe_account_id.
// On expose un booléen has_phone (badge "Téléphone vérifié") SANS jamais renvoyer le numéro.
export const getPublicProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, city, created_at, role, is_founder, founder_number, show_founder_badge, is_creator, creator_craft, phone')
    .eq('id', userId)
    .single()
  if (error) throw error
  const { phone, ...pub } = data
  return { ...pub, has_phone: !!(phone && phone.trim()) }
}

// Liste les créateurs péi (pour la page vitrine « Nos créateurs »).
// Champs publics uniquement, triés du plus récent au plus ancien.
export const getCreators = async (limit = 60) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, city, creator_craft, created_at')
    .eq('is_creator', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const uploadAvatar = async (userId, file) => {
  const name = file.name ?? 'avatar.jpg'
  const ext  = name.includes('.') ? name.split('.').pop() : 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  await updateProfile(userId, { avatar_url: path })
  return url
}

export const getProfileReviews = async (userId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, buyer:profiles!reviews_reviewer_id_fkey(username, avatar_url)`)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
