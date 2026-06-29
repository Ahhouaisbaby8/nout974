import { supabase } from './supabase'

// Stats PUBLIQUES d'un vendeur (affichées sur son profil) : nombre de ventes finalisées.
// Léger et sans données sensibles — juste le compteur de ventes pour la preuve sociale.
export const getPublicSellerStats = async (sellerId) => {
  if (!sellerId) return { nbVentes: 0 }
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .in('status', ['completed', 'payout_pending'])
  return { nbVentes: count ?? 0 }
}

// Agrège toutes les données business d'un vendeur pour l'Espace Vendeur.
// Le vendeur reçoit son versement net (seller_payout), pas le total payé par l'acheteur (qui inclut la
// protection + le port). Nouveau modèle : seller_payout = prix plein ; anciennes commandes = montant réduit conservé.
export const getSellerDashboard = async (sellerId) => {
  // 1. Ventes (commandes où il est vendeur) avec le prix réel de l'article
  const { data: sales, error: salesErr } = await supabase
    .from('orders')
    .select(`
      id, status, total_price, seller_payout, shipping_method, created_at,
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

  // 4. Profil vendeur — pour savoir si les paiements (Stripe/IBAN) sont configurés
  // On ne lit QUE is_verified (public) — jamais l'IBAN/Stripe d'un vendeur tiers (fuite RGPD).
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified')
    .eq('id', sellerId)
    .single()

  // Montant net vendeur = ce qui lui est réellement versé (seller_payout figé), repli sur le prix de l'article.
  const montant = (o) => Number(o.seller_payout ?? o.listing?.price ?? 0)

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

  // Taux de conversion (ventes finalisées / vues totales)
  const tauxConversion = totalViews > 0
    ? Math.round((nbVentes / totalViews) * 1000) / 10   // en %
    : 0

  // Graphique : gains par mois sur les 6 derniers mois
  const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const now = new Date()
  const chart = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const moisVentes = ventesFinalisees.filter(o => {
      const od = new Date(o.created_at)
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
    })
    chart.push({
      label: moisLabels[d.getMonth()],
      gains: Math.round(moisVentes.reduce((s, o) => s + montant(o), 0) * 100) / 100,
      ventes: moisVentes.length,
    })
  }

  // Articles qui performent : top 5 annonces actives par nombre de vues
  const topListings = [...activeListings]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5)

  // Historique des virements (ventes versées ou en attente de virement)
  const virements = (sales ?? [])
    .filter(o => ['completed', 'payout_pending'].includes(o.status))
    .map(o => ({
      id: o.id,
      title: o.listing?.title ?? 'Article',
      montant: montant(o),
      date: o.created_at,
      verse: o.status === 'completed',
    }))

  // Paiements configurés ?
  const paiementsActifs = !!profile?.is_verified

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
      tauxConversion,
    },
    chart,
    topListings,
    virements,
    paiementsActifs,
    sales: sales ?? [],
    activeListings,
  }
}
