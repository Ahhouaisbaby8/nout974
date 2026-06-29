import { supabase } from './supabase'

// Crée une offre structurée (acheteur qui propose, ou vendeur qui fait une contre-offre).
// `proposedBy` = auteur de cette offre-ci ; l'insert est gardé par la RLS (proposed_by = soi).
export const createOffer = async ({ listingId, buyerId, sellerId, amount, proposedBy }) => {
  const { data, error } = await supabase
    .from('offers')
    .insert({
      listing_id:  listingId,
      buyer_id:    buyerId,
      seller_id:   sellerId,
      proposed_by: proposedBy,
      amount,
      status:      'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Offres échangées entre l'utilisateur courant et l'autre partie, pour une annonce donnée
// (ordre chronologique). La RLS garantit qu'on ne voit que ses propres offres.
export const getOffers = async (listingId, userId, otherId) => {
  if (!listingId || !userId || !otherId) return []
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('listing_id', listingId)
    .or(`and(buyer_id.eq.${userId},seller_id.eq.${otherId}),and(buyer_id.eq.${otherId},seller_id.eq.${userId})`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Une offre par id (RLS : seul l'acheteur/vendeur la voit). Sert au tunnel de paiement.
export const getOfferById = async (offerId) => {
  if (!offerId) return null
  const { data, error } = await supabase.from('offers').select('*').eq('id', offerId).single()
  if (error) return null
  return data
}

// Répondre à une offre (accepter / refuser / contre-offre) — passe par la fonction serveur,
// qui valide qui a le droit de répondre et met les statuts à jour de façon cohérente.
export const respondOffer = async ({ offerId, action, counterAmount }) => {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/.netlify/functions/respond-offer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ offer_id: offerId, action, counter_amount: counterAmount }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Erreur lors de la réponse à l\'offre.')
  return json
}
