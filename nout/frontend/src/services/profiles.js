import { supabase } from './supabase'

// Profil OWN/affichage — colonnes non sensibles uniquement (email/iban/stripe/phone
// ne sont jamais exposés via la table ; le propriétaire les lit via la RPC get_my_account).
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, city, role, is_verified, is_banned, is_founder, founder_number, show_founder_badge, is_creator, creator_craft, created_at, updated_at')
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
    .select('id, username, avatar_url, bio, city, created_at, role, is_founder, founder_number, show_founder_badge, is_creator, creator_craft')
    .eq('id', userId)
    .single()
  if (error) throw error
  // phone retiré du périmètre public (le numéro ne doit jamais transiter via l'API).
  // Badge "téléphone vérifié" à re-câbler plus tard via une colonne générée booléenne si besoin.
  return { ...data, has_phone: false }
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
    .select('id, username, avatar_url, bio, city, role, is_creator, creator_craft, updated_at')
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
