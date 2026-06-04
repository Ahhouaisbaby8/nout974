import { supabase } from '../services/supabase'

export const getAvatarUrl = (avatarPath) =>
  avatarPath
    ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
    : null
