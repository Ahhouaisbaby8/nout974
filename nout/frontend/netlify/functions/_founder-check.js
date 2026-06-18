'use strict'

const { createClient } = require('@supabase/supabase-js')

// Client service_role — utilisé uniquement côté serveur (Netlify Functions)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Variable d'env serveur — nulle avant le lancement officiel
// Format : '2026-09-01T00:00:00+04:00' (heure de La Réunion)
const LAUNCH_DATE = process.env.FOUNDER_LAUNCH_DATE ?? null

/**
 * Vérifie l'éligibilité d'un utilisateur au statut Membre Fondateur
 * et attribue si toutes les conditions cumulatives sont remplies.
 *
 * Conditions (dès LAUNCH_DATE) :
 *   - Compte créé après LAUNCH_DATE
 *   - 5 annonces actives (is_active=true, is_sold=false) créées après LAUNCH_DATE
 *   - 1 transaction terminée (achat OU vente, statut completed/payout_pending)
 *
 * L'attribution est atomique via pg_advisory_xact_lock côté SQL :
 * deux appels simultanés ne peuvent pas attribuer le même numéro
 * ni dépasser le plafond de 50.
 *
 * @param {string} userId UUID de l'utilisateur à vérifier
 * @returns {Promise<{ eligible: boolean, assigned: boolean, reason?: string }>}
 */
async function checkAndAssignFounder(userId) {
  if (!userId) return { eligible: false, assigned: false, reason: 'no_user_id' }

  // Récupérer le profil (is_founder + created_at pour le filtre LAUNCH_DATE)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_founder, created_at')
    .eq('id', userId)
    .single()

  if (profileErr) throw profileErr

  // Déjà fondateur → idempotent, on ne réattribue pas
  if (profile?.is_founder) {
    return { eligible: false, assigned: false, reason: 'already_founder' }
  }

  // Compte créé avant LAUNCH_DATE → non éligible
  const accountCreatedAt = profile?.created_at
  if (LAUNCH_DATE && accountCreatedAt && new Date(accountCreatedAt) < new Date(LAUNCH_DATE)) {
    return { eligible: false, assigned: false, reason: 'account_before_launch' }
  }

  // Annonces actives (>= 5)
  let listingsQ = supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_sold', false)
  if (LAUNCH_DATE) listingsQ = listingsQ.gte('created_at', LAUNCH_DATE)

  const { count: listingsCount, error: lErr } = await listingsQ
  if (lErr) throw lErr
  if ((listingsCount ?? 0) < 5) {
    return { eligible: false, assigned: false, reason: 'not_enough_listings', count: listingsCount ?? 0 }
  }

  // Au moins 1 transaction terminée (achat ou vente)
  let ordersQ = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .in('status', ['completed', 'payout_pending'])
  if (LAUNCH_DATE) ordersQ = ordersQ.gte('created_at', LAUNCH_DATE)

  const { count: ordersCount, error: oErr } = await ordersQ
  if (oErr) throw oErr
  if ((ordersCount ?? 0) < 1) {
    return { eligible: false, assigned: false, reason: 'no_transaction' }
  }

  // Attribution atomique via la fonction SQL sécurisée (pg_advisory_xact_lock)
  const { data: assigned, error: rpcErr } = await supabase
    .rpc('assign_founder', { p_user_id: userId })
  if (rpcErr) throw rpcErr

  return { eligible: true, assigned: !!assigned }
}

module.exports = { checkAndAssignFounder }
