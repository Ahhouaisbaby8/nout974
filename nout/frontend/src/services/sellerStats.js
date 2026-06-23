import { supabase } from './supabase'

// Agrège toutes les données business d'un vendeur pour l'Espace Vendeur.
// Le vendeur reçoit le PRIX DE SON ARTICLE (listing.price), pas le total payé par l'acheteur
// (qui inclut frais de protection + port). C'est ce montant net qui compte pour ses gains.
export const getSellerDashboard = async (sellerId) => {
  // 1. Ventes (commandes où il est vendeur) avec le prix réel de l'article
  const { data: sales, error: salesErr } = await supabase
    .from('orders')
    .select(`
      id, status, total_price, shipping_method, created_at,
      listing:listings(id, title, images, price),
      buyer:profiles!buyer_id(id, username, avatar_url)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (salesErr) throw salesErr

  // 2. Annonces du vendeur (pour stats : actives, vendues, vues)
  const { data: listings, error: listErr } = await supabase
    .from('listings')
    .select('id, title, price, images, is_sold, is_active, views, created_at, category')
    .eq('user_id', sellerId)
    .order('created_at', { ascending: false })
  if (listErr) throw listErr

  // 3. Note moyenne vendeur
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('seller_id', sellerId)

  // Montant net vendeur = prix de l'article (pas le total payé par l'acheteur)
  const montant = (o) => Number(o.listing?.price ?? 0)

  // Solde réparti par état (cf. flux escrow)
  //   paid           = vendu, en attente de remise/confirmation du code
  //   payout_pending = confirmé, virement en attente (vendeur sans Stripe Connect)
  //   completed      = confirmé + versé
  const enAttenteRemise = (sales ?? [])
    .filter(o => o.status === 'paid')
    .reduce((s, o) => s + montant(o), 0)
  const aVerser = (sales ?? [])
    .filter(o => o.status === 'payout_pending')
    .reduce((s, o) => s + montant(o), 0)
  const verse = (sales ?? [])
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + montant(o), 0)

  const ventesFinalisees = (sales ?? []).filter(o =>
    ['completed', 'payout_pending'].includes(o.status)
  )

  const activeListings = (listings ?? []).filter(l => l.is_active && !l.is_sold)
  const totalViews = (listings ?? []).reduce((s, l) => s + (l.views ?? 0), 0)
  const nbVentes = ventesFinalisees.length
  const totalGagne = enAttenteRemise + aVerser + verse
  const panierMoyen = nbVentes > 0
    ? Math.round((verse + aVerser) / nbVentes * 100) / 100
    : 0
  const noteCount = reviews?.length ?? 0
  const noteMoyenne = noteCount > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / noteCount) * 10) / 10
    : 0

  return {
    solde: {
      enAttenteRemise: Math.round(enAttenteRemise * 100) / 100,
      aVerser:         Math.round(aVerser * 100) / 100,
      verse:           Math.round(verse * 100) / 100,
      totalGagne:      Math.round(totalGagne * 100) / 100,
    },
    stats: {
      annoncesActives: activeListings.length,
      nbVentes,
      totalViews,
      panierMoyen,
      noteMoyenne,
      noteCount,
    },
    sales: sales ?? [],
    activeListings,
  }
}
