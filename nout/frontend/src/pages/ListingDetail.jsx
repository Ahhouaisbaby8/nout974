import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getListingById, deleteListing, updateListing, getSimilarListings } from '../services/listings'
import { supabase } from '../services/supabase'
import { sendMessage } from '../services/messages'
import { createOffer } from '../services/offers'
import { formatPrice, formatRelativeDate } from '../utils/formatters'
import { CATEGORIES, CONDITIONS } from '../utils/categories'
import { getAvatarUrl } from '../utils/avatar'
import { Share2, Heart, MapPin, Eye, Ruler, Palette, Tag, Layers, Pencil, Trash2, CheckCircle2, CreditCard, MessageCircle, Link2, Flag, Search, Camera as CameraIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { isFavorite, addFavorite, removeFavorite } from '../services/favorites'
import { getSellerRating } from '../services/reviews'
import { SHIPPING_METHODS, SHIPPING_ORDER, computeBuyerTotal, computeProtectionFee, getShippingFee } from '../utils/shipping'
import { Truck, Home as HomeIcon, Store, ShieldCheck } from 'lucide-react'
import { SAFE_ZONES, SAFE_TIPS } from '../utils/safeZones'
import { detailUrl, thumbUrl } from '../utils/image'

const SHIP_ICONS = { hand: Store, relay: MapPin, home: HomeIcon }

function ShippingSelector({ value, onChange, price }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="flex items-center gap-2 text-sm font-semibold text-nout-dark mb-2">
        <Truck className="w-4 h-4 text-nout-primary" />
        Mode de livraison
      </p>
      <div className="space-y-2">
        {SHIPPING_ORDER.map(id => {
          const m = SHIPPING_METHODS[id]
          const Icon = SHIP_ICONS[id] ?? Truck
          const fee = getShippingFee(id)
          const active = value === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 text-left rounded-lg border-2 px-3 py-2.5 transition-all ${active ? 'border-nout-primary bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-nout-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-nout-dark flex items-center gap-1.5">
                  {m.label}
                  {m.recommended && (
                    <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Conseillé</span>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">
                  {m.delay ? `${m.delay} · ` : ''}{m.sublabel}
                </p>
              </div>
              <span className={`text-sm font-bold flex-shrink-0 ${fee === 0 ? 'text-emerald-600' : 'text-nout-dark'}`}>
                {fee === 0 ? 'Gratuit' : formatPrice(fee)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Safe zones : conseils + lieux publics sûrs quand main propre choisie */}
      {value === 'hand' && (
        <div className="mt-3 rounded-lg border border-[#B9E5E1] bg-[#EAF6F5] p-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0E7FAB] mb-1.5">
            <ShieldCheck className="w-4 h-4" />
            Remise en lieu public conseillée
          </p>
          <ul className="text-[12px] text-gray-600 space-y-1 mb-2">
            {SAFE_TIPS.map((t, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-[#0E7FAB]">•</span>{t}</li>
            ))}
          </ul>
          <details className="text-[12px]">
            <summary className="cursor-pointer text-[#0E7FAB] font-medium">Voir des lieux sûrs par zone</summary>
            <div className="mt-2 space-y-2">
              {SAFE_ZONES.map(z => (
                <div key={z.zone}>
                  <p className="font-semibold text-nout-texte text-[11px] uppercase tracking-wide">{z.zone}</p>
                  <ul className="text-gray-500 text-[12px]">
                    {z.lieux.map((l, i) => <li key={i}>· {l}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'
import ReportModal from '../components/ui/ReportModal'
import ListingCard from '../components/ui/ListingCard'
import SkeletonCard from '../components/ui/SkeletonCard'
import ListingAttributes from '../components/ui/ListingAttributes'
import CreatorBadge from '../components/ui/CreatorBadge'
import ConfirmModal from '../components/ui/ConfirmModal'

export default function ListingDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [listing, setListing]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [markingVendu, setMarkingVendu] = useState(false)
  const [paying,   setPaying]   = useState(false)
  const [payError, setPayError]       = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [markError, setMarkError]     = useState('')
  const [offerError, setOfferError]   = useState('')
  const [showReport, setShowReport] = useState(false)
  const [showOffer, setShowOffer]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showVenduConfirm, setShowVenduConfirm]   = useState(false)
  const [similar, setSimilar]             = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerSending, setOfferSending] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copyToast, setCopyToast]         = useState(false)
  const [detailFav, setDetailFav] = useState(false)
  const [favPulse, setFavPulse]   = useState(false)
  const [favCount, setFavCount]   = useState(null)   // nombre de likes (favoris) — null tant que non chargé
  const [lightbox, setLightbox]   = useState(false)  // visionneuse plein écran des photos
  const [touchX, setTouchX]       = useState(null)   // suivi du swipe mobile dans la visionneuse
  const [sellerRating, setSellerRating] = useState(null)
  const [shipMethod, setShipMethod] = useState('hand')
  // Coordonnées de livraison (obligatoires si livraison). Pré-remplies depuis le profil.
  const [shipPhone, setShipPhone]       = useState(profile?.phone ?? '')
  const [shipAddress, setShipAddress]   = useState('')
  const [shipCity, setShipCity]         = useState(profile?.city ?? '')
  const [shipPostcode, setShipPostcode] = useState('')

  useEffect(() => {
    getListingById(id)
      .then(data => {
        setListing(data)
        // Compteur de likes : lu depuis la colonne dénormalisée listings.favorite_count (maintenue par
        // un trigger côté base). Reste null si la colonne n'existe pas encore (migration non passée) → le
        // compteur et le badge « En demande » sont simplement masqués (aucune erreur).
        if (typeof data.favorite_count === 'number') setFavCount(data.favorite_count)
        document.title = `${data.title} — ${formatPrice(data.price)} | NOUT 974`
        if (data.category) {
          setLoadingSimilar(true)
          getSimilarListings(data.category, data.id)
            .then(setSimilar)
            .catch(() => {})
            .finally(() => setLoadingSimilar(false))
        }
        if (data.profiles?.id) {
          getSellerRating(data.profiles.id)
            .then(setSellerRating)
            .catch(() => {})
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    // Temps réel : on écoute les changements de la ligne listing (le trigger met à jour favorite_count
    // à chaque like/unlike de N'IMPORTE quel membre) → le compteur bouge en direct sans recharger la page.
    // Nécessite que la réplication Realtime soit activée sur la table `listings` côté Supabase.
    const channel = supabase
      .channel(`listing-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings', filter: `id=eq.${id}` },
        (payload) => {
          if (typeof payload.new?.favorite_count === 'number') setFavCount(payload.new.favorite_count)
        })
      .subscribe()

    return () => {
      document.title = 'NOUT — Marketplace seconde main La Réunion 974'
      supabase.removeChannel(channel)
    }
  }, [id])

  // Navigation photo (miniatures + visionneuse) — boucle sur le tableau d'images.
  const photoCount = listing?.images?.length ?? 0
  const nextPhoto = () => setPhotoIdx(i => (photoCount ? (i + 1) % photoCount : 0))
  const prevPhoto = () => setPhotoIdx(i => (photoCount ? (i - 1 + photoCount) % photoCount : 0))

  // Clavier dans la visionneuse : ← / → pour défiler, Échap pour fermer.
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false)
      else if (e.key === 'ArrowRight') nextPhoto()
      else if (e.key === 'ArrowLeft') prevPhoto()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, photoCount])

  useEffect(() => {
    if (user?.id) {
      isFavorite(user.id, id).then(setDetailFav).catch(() => {})
    }
  }, [user?.id, id])

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteListing(id)
      navigate('/')
    } catch (err) {
      // Affiche le vrai motif (vente en cours, etc.) plutôt qu'un message générique
      setDeleteError(err?.message || 'Erreur lors de la suppression.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleMarkVendu = async () => {
    setMarkingVendu(true)
    try {
      const updated = await updateListing(id, { is_sold: true })
      setListing(prev => ({ ...prev, ...updated }))
      setShowVenduConfirm(false)
    } catch {
      setMarkError('Erreur. Réessaie.')
    } finally {
      setMarkingVendu(false)
    }
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-5 w-20 bg-gray-200 rounded-full mb-4" />
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-200 rounded-2xl" />
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
          <div>
            <div className="h-7 bg-gray-200 rounded-full w-3/4 mb-3" />
            <div className="h-9 bg-gray-200 rounded-full w-1/3" />
          </div>
          <div className="flex gap-3">
            <div className="h-4 w-24 bg-gray-100 rounded-full" />
            <div className="h-4 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="bg-gray-100 rounded-xl p-4 space-y-2">
            <div className="h-3 bg-gray-200 rounded-full w-full" />
            <div className="h-3 bg-gray-200 rounded-full w-5/6" />
            <div className="h-3 bg-gray-200 rounded-full w-4/6" />
          </div>
          <div className="bg-gray-100 rounded-xl p-4 flex gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded-full w-1/3" />
              <div className="h-3 bg-gray-200 rounded-full w-1/2" />
            </div>
          </div>
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-5xl mb-4"></p>
      <p className="text-lg font-semibold text-nout-dark">Annonce introuvable</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Retour à l'accueil</button>
    </div>
  )

  const isOwner    = user?.id === listing.user_id
  const category   = CATEGORIES.find(c => c.id === listing.category)
  const condition  = CONDITIONS.find(c => c.id === listing.condition)

  // Modèle protection acheteur : l'acheteur paie le prix + protection (10%+0,25€) + port.
  // Le vendeur, lui, reçoit le prix affiché en entier.
  const portFee        = getShippingFee(shipMethod)
  const protectionFee  = computeProtectionFee(listing.price)
  const totalAcheteur  = computeBuyerTotal(listing.price, shipMethod)
  const images     = listing.images?.length > 0 ? listing.images : null
  const seller     = listing.profiles
  const isSellerActive = listing.created_at &&
    Date.now() - new Date(listing.created_at).getTime() < 30 * 24 * 60 * 60 * 1000

  const handleSendOffer = async () => {
    const amount = parseFloat(offerAmount)
    if (!amount || amount <= 0) return
    setOfferSending(true)
    try {
      // Offre STRUCTURÉE (montant + statut) — le vendeur pourra accepter/refuser/contre-proposer
      // dans la conversation. L'acheteur propose, donc proposed_by = lui.
      await createOffer({
        listingId:  id,
        buyerId:    user.id,
        sellerId:   seller.id,
        amount,
        proposedBy: user.id,
      })
      setShowOffer(false)
      setOfferAmount('')
      navigate(`/messages/${seller.id}?annonce=${id}`)
    } catch {
      setOfferError("Erreur lors de l'envoi de l'offre.")
    } finally {
      setOfferSending(false)
    }
  }

  const listingUrl       = `${window.location.origin}/annonce/${id}`
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Regarde cette annonce sur NOUT 974 \n${listing.title} — ${formatPrice(listing.price)}\n${listingUrl}`)}`

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: listing.title, text: 'Regarde cette annonce sur NOUT 974 !', url: listingUrl }) } catch {}
    } else {
      setShowShareMenu(s => !s)
    }
  }

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(listingUrl) } catch {}
    setCopyToast(true)
    setTimeout(() => setCopyToast(false), 2500)
    setShowShareMenu(false)
  }

  const handleDetailFav = async () => {
    if (!user) { navigate('/connexion'); return }
    setFavPulse(true)
    setTimeout(() => setFavPulse(false), 400)
    const next = !detailFav
    setDetailFav(next)
    setFavCount(c => (c == null ? c : Math.max(0, c + (next ? 1 : -1))))  // maj optimiste du compteur
    try {
      if (next) await addFavorite(user.id, id)
      else      await removeFavorite(user.id, id)
    } catch {
      setDetailFav(!next)
      setFavCount(c => (c == null ? c : Math.max(0, c + (next ? -1 : 1))))  // rollback si échec
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── GALERIE ── */}
        <div>
          <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            {images ? (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                aria-label="Agrandir la photo"
                className="w-full h-full block cursor-zoom-in"
              >
                <img
                  src={detailUrl(images[photoIdx])}
                  alt={listing.title}
                  width="900"
                  height="900"
                  fetchPriority="high"
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl text-gray-300"></div>
            )}

            {/* Compteur de likes en direct (façon Vinted), en surimpression sur la photo */}
            {favCount != null && favCount > 0 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full pl-2.5 pr-3 py-1 shadow-sm">
                <Heart className="w-4 h-4 fill-red-500 stroke-red-500" />
                <span className="text-sm font-semibold text-nout-dark tabular-nums">{favCount}</span>
              </div>
            )}
          </div>

          {images && images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIdx ? 'border-nout-primary' : 'border-transparent'}`}
                >
                  <img src={thumbUrl(url)} alt="" loading="lazy" width="64" height="64" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── INFOS ── */}
        <div className="flex flex-col gap-4">

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {listing.is_sold && (
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">VENDU</span>
            )}
            {/* Preuve sociale « En demande » : affichée quand l'article dépasse un seuil de likes (façon Vinted) */}
            {!listing.is_sold && favCount != null && favCount >= 3 && (
              <span className="bg-[#FDECEC] text-[#C0392B] text-xs font-bold px-3 py-1 rounded-full">
                En demande
              </span>
            )}
            {category && (
              <span className="bg-[#EAF6F5] text-nout-primary text-xs font-medium px-3 py-1 rounded-full">
                {category.label}
              </span>
            )}
            {condition && (
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                {condition.label}
              </span>
            )}
          </div>

          {/* Titre + Prix */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-title text-[22px] font-medium text-nout-texte leading-snug tracking-tight flex-1">{listing.title}</h1>
              <button
                type="button"
                onClick={handleDetailFav}
                aria-label={detailFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`flex-shrink-0 mt-1 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${detailFav ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200 hover:border-red-200'} ${favPulse ? 'scale-125' : ''}`}
              >
                <Heart className={`w-5 h-5 transition-all duration-200 ${detailFav ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-gray-400'}`} />
              </button>
            </div>
            <p className="font-title text-[24px] font-semibold text-nout-texte tracking-tight mt-2">{formatPrice(listing.price)}</p>
          </div>

          {/* Lieu + date + vues */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
            <span>{listing.city}</span>
            <span>{formatRelativeDate(listing.created_at)}</span>
            <span>{listing.views ?? 0} vue{listing.views !== 1 ? 's' : ''}</span>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-title text-[13px] font-semibold uppercase tracking-wide text-nout-muted mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Tableau d'attributs façon Vinted (catégorie, marque, taille, état, couleur, matière…) */}
          <ListingAttributes listing={listing} />

          {/* Vendeur */}
          {seller && (
            <Link
              to={`/profil/${seller.id}`}
              className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              {getAvatarUrl(seller.avatar_url) ? (
                <img
                  src={getAvatarUrl(seller.avatar_url)}
                  alt={seller.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-nout-primary flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-nout-primary text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {seller.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div>
                <p className="font-semibold text-nout-dark flex items-center gap-2 flex-wrap">
                  {seller.username}
                  {seller.is_creator && <CreatorBadge size="sm" />}
                </p>
                {sellerRating && sellerRating.count > 0 ? (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-amber-500 mt-0.5">
                    <span></span>
                    <span className="text-nout-dark">{sellerRating.average.toFixed(1)}</span>
                    <span className="text-gray-400 font-normal">
                      ({sellerRating.count} avis)
                    </span>
                  </span>
                ) : sellerRating && (
                  <span className="text-[11px] text-gray-400 mt-0.5 block">Pas encore d'avis</span>
                )}
                {isSellerActive && (
                  <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Vendeur actif
                  </span>
                )}
                <p className="text-xs text-gray-400">Membre depuis {formatRelativeDate(seller.created_at)}</p>
              </div>
              <span className="ml-auto text-gray-300">›</span>
            </Link>
          )}

          {/* Partager cette annonce */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-nout-dark text-sm mb-3">Partager cette annonce</h2>
            <div className="flex gap-2">

              {/* WhatsApp */}
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ background: '#25D366' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>

              {/* Copier le lien */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-all"
                style={{ background: copyToast ? '#15803D' : '#007A6E' }}
              >
                {copyToast ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                )}
                {copyToast ? 'Lien copié !' : 'Copier'}
              </button>

            </div>
          </div>

          {/* Boutons d'action — PROPRIÉTAIRE */}
          {isOwner ? (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/annonce/${id}/modifier`)}
                  className="btn-secondary flex-1"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 bg-red-50 text-red-500 border-2 border-red-200 rounded-nout font-bold hover:bg-red-100 transition-all disabled:opacity-60"
                >
                  {deleting ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
              {!listing.is_sold && (
                <button
                  onClick={() => setShowVenduConfirm(true)}
                  disabled={markingVendu}
                  className="w-full px-6 py-3 bg-green-50 text-green-600 border-2 border-green-200 rounded-nout font-bold hover:bg-green-100 transition-all disabled:opacity-60"
                >
                  {markingVendu ? 'Mise à jour…' : 'Marquer comme vendu'}
                </button>
              )}
              {deleteError && <p className="text-sm text-red-500 text-center">{deleteError}</p>}
              {markError   && <p className="text-sm text-red-500 text-center">{markError}</p>}
            </div>

          /* Boutons — ARTICLE VENDU */
          ) : listing.is_sold ? (
            <div className="bg-gray-100 text-gray-500 text-center rounded-xl py-4 font-semibold">
              Cet article a déjà été vendu
            </div>

          /* Boutons — VISITEUR */
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {payError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {payError}
                </div>
              )}
              {user ? (
                <>
                  {/* Récap court — le choix livraison/adresse/paiement se fait sur la page commande */}
                  <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-100 space-y-2">
                    <div className="flex justify-between text-gray-500">
                      <span>Prix de l'article</span>
                      <span>{formatPrice(listing.price)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Protection acheteur <span className="text-gray-400">(10 % + 0,25 €)</span></span>
                      <span>{formatPrice(protectionFee)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-nout-texte">
                      <span>Total en main propre</span>
                      <span>{formatPrice(computeBuyerTotal(listing.price, 'hand'))}</span>
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-1">
                      <Truck className="w-3.5 h-3.5" />
                      Main propre gratuite, ou livraison dès {formatPrice(getShippingFee('relay'))} (au choix à l'étape suivante)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/commander/${id}`)}
                      className="btn-primary flex-1 py-4 text-base"
                    >
                      Acheter
                    </button>
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleShare}
                        className="btn-secondary h-full px-4 flex items-center justify-center"
                        aria-label="Partager"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      {showShareMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-52">
                            <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setShowShareMenu(false)}>
                              WhatsApp
                            </a>
                            <button type="button" onClick={handleCopyLink} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left">
                              Copier le lien
                            </button>
                            <button type="button" onClick={() => setShowShareMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors w-full text-left border-t border-gray-100">
                              Fermer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOffer(true)}
                    className="w-full py-3 rounded-nout border-2 border-[#00C4B4] text-[#00C4B4] font-bold text-sm hover:bg-[#00C4B4] hover:text-white transition-all"
                  >
                    Faire une offre
                  </button>
                  <button
                    onClick={() => navigate(`/messages/${seller?.id}?annonce=${id}`)}
                    className="btn-secondary w-full py-3 text-sm"
                  >
                    Contacter le vendeur
                  </button>
                </>
              ) : (
                <>
                  {/* Visiteur non connecté : récap basé sur la main propre (gratuit).
                      Le choix du mode de livraison se fait après connexion. */}
                  <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-100 space-y-2">
                    <div className="flex justify-between text-gray-500">
                      <span>Prix de l'article</span>
                      <span>{formatPrice(listing.price)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Protection acheteur <span className="text-gray-400">(10 % + 0,25 €)</span></span>
                      <span>{formatPrice(protectionFee)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-nout-texte">
                      <span>Total en main propre</span>
                      <span>{formatPrice(computeBuyerTotal(listing.price, 'hand'))}</span>
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-1">
                      <Truck className="w-3.5 h-3.5" />
                      Livraison Chronopost disponible au paiement (dès {formatPrice(getShippingFee('relay'))})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/connexion?redirect=/annonce/${id}`}
                      className="btn-primary flex-1 py-4 text-base text-center block"
                    >
                      Acheter — {formatPrice(computeBuyerTotal(listing.price, 'hand'))}
                    </Link>
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleShare}
                        className="btn-secondary h-full px-4 flex items-center justify-center"
                        aria-label="Partager"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      {showShareMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-52">
                            <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setShowShareMenu(false)}>
                              WhatsApp
                            </a>
                            <button type="button" onClick={handleCopyLink} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left">
                              Copier le lien
                            </button>
                            <button type="button" onClick={() => setShowShareMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors w-full text-left border-t border-gray-100">
                              Fermer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/connexion?redirect=/annonce/${id}`}
                    className="btn-secondary w-full py-3 text-sm text-center block"
                  >
                    Contacter le vendeur
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Signaler */}
          {user && !isOwner && (
            <button
              onClick={() => setShowReport(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors text-center mt-1"
            >
              Signaler cette annonce
            </button>
          )}


        </div>
      </div>

      {/* ── ANNONCES SIMILAIRES ── */}
      {(loadingSimilar || similar.length > 0) && (
        <div className="mt-12">
          <h2 className="font-title text-[15px] font-semibold uppercase tracking-wide text-nout-muted mb-4">Annonces similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {loadingSimilar
              ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
              : similar.map(l => <ListingCard key={l.id} listing={l} />)
            }
          </div>
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Supprimer cette annonce ?"
        message="Cette action est définitive. L'annonce sera retirée du site et ne pourra pas être récupérée."
        confirmLabel="Supprimer"
        loadingLabel="Suppression…"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        open={showVenduConfirm}
        title="Marquer comme vendu ?"
        message="L'article ne sera plus visible dans les recherches. Tu pourras toujours le retrouver dans tes annonces."
        confirmLabel="Marquer comme vendu"
        loadingLabel="Mise à jour…"
        loading={markingVendu}
        onConfirm={handleMarkVendu}
        onCancel={() => setShowVenduConfirm(false)}
      />

      {showReport && (
        <ReportModal
          listingId={id}
          onClose={() => setShowReport(false)}
        />
      )}

      {copyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-nout-dark text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl pointer-events-none">
          Lien copié !
        </div>
      )}

      {showOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl overflow-y-auto max-h-[90dvh]">
            <h3 className="text-lg font-bold text-nout-dark mb-1">Faire une offre</h3>
            <p className="text-sm text-gray-400 mb-4 truncate">{listing.title}</p>
            <div className="relative mb-2">
              <input
                type="number"
                min="1"
                step="0.5"
                placeholder="Montant proposé"
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                className="input-field w-full pr-8"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">€</span>
            </div>
            <p className="text-xs text-gray-400 mb-5">Prix demandé : {formatPrice(listing.price)}</p>
            {offerError && <p className="text-sm text-red-500 text-center mb-3">{offerError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowOffer(false); setOfferAmount('') }}
                className="flex-1 py-3 rounded-nout border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSendOffer}
                disabled={!offerAmount || parseFloat(offerAmount) <= 0 || offerSending}
                className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {offerSending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VISIONNEUSE PHOTO PLEIN ÉCRAN ── (clic sur la photo → défile flèches / swipe / miniatures) */}
      {lightbox && images && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex flex-col"
          onClick={() => setLightbox(false)}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX == null) return
            const dx = e.changedTouches[0].clientX - touchX
            if (dx > 50) prevPhoto()
            else if (dx < -50) nextPhoto()
            setTouchX(null)
          }}
        >
          {/* Barre du haut : position + fermer */}
          <div className="flex items-center justify-between p-4 text-white/90" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm tabular-nums">{photoIdx + 1} / {images.length}</span>
            <button type="button" onClick={() => setLightbox(false)} aria-label="Fermer" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image + flèches */}
          <div className="flex-1 flex items-center justify-center px-2 min-h-0" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button type="button" onClick={prevPhoto} aria-label="Photo précédente" className="hidden sm:flex flex-shrink-0 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <img src={detailUrl(images[photoIdx])} alt={listing.title} className="max-h-full max-w-full object-contain mx-2 select-none" />
            {images.length > 1 && (
              <button type="button" onClick={nextPhoto} aria-label="Photo suivante" className="hidden sm:flex flex-shrink-0 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Miniatures */}
          {images.length > 1 && (
            <div className="flex gap-2 justify-center p-4 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === photoIdx ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={thumbUrl(url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
