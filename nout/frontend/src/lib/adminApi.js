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

// Verse à la demande tous les vendeurs en attente (livrés + délai écoulé). Filet quand le cron
// planifié ne s'exécute pas. Sûr : réutilise la logique de versement idempotente côté serveur.
export async function releasePayouts() {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/.netlify/functions/admin-release-payouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
  return data
}
