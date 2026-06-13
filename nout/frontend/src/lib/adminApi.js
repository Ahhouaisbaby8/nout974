import { supabase } from '../services/supabase'

export async function adminAction(action, targetId, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/.netlify/functions/admin-actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ action, targetId, ...extra }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
  return data
}
