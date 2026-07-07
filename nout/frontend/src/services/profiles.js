import { supabase } from './supabase'
import { validateImageFile } from '../utils/image'

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

// Adresse d'EXPÉDITION du vendeur (données perso → lues via la RPC sécurisée
// get_my_account, jamais via un SELECT public). Sert d'expéditeur sur les étiquettes
// transporteur. NE PAS confondre avec l'adresse de livraison de l'acheteur (sur la commande).
export const getMyShippingAddress = async () => {
  const { data, error } = await supabase.rpc('get_my_account')
  if (error) throw error
  const acc = Array.isArray(data) ? data[0] : data
  return {
    ship_address:  acc?.ship_address  ?? '',
    ship_address2: acc?.ship_address2 ?? '',
    ship_postcode: acc?.ship_postcode ?? '',
    ship_city:     acc?.ship_city     ?? '',
  }
}

// Enregistre l'adresse d'expédition du vendeur (écriture couverte par la RLS
// "UPDATE USING (id = auth.uid())"). On ne renvoie pas les champs (ils sont sensibles).
export const updateMyShippingAddress = async (userId, addr) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      ship_address:  addr.ship_address?.trim()  || null,
      ship_address2: addr.ship_address2?.trim() || null,
      ship_postcode: addr.ship_postcode?.trim() || null,
      ship_city:     addr.ship_city?.trim()     || null,
    })
    .eq('id', userId)
  if (error) throw error
}

export const uploadAvatar = async (userId, file) => {
  // Sécurité : valide le TYPE MIME réel + la taille ; extension dérivée du type, pas du nom client.
  const ext = validateImageFile(file)
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw error
  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  await updateProfile(userId, { avatar_url: path })
  return url
}

export const getProfileReviews = async (userId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, buyer:profiles!reviews_buyer_id_fkey(username, avatar_url)`)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
