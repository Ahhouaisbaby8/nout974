import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getListingById, deleteListing, updateListing, getSimilarListings } from '../services/listings'
import { sendMessage } from '../services/messages'
import { formatPrice, formatRelativeDate } from '../utils/formatters'
import { CATEGORIES, CONDITIONS } from '../utils/categories'
import { getAvatarUrl } from '../utils/avatar'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'
import ReportModal from '../components/ui/ReportModal'
import ListingCard from '../components/ui/ListingCard'
import SkeletonCard from '../components/ui/SkeletonCard'

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
  const [payError, setPayError] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [showOffer, setShowOffer]   = useState(false)
  const [similar, setSimilar]             = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerSending, setOfferSending] = useState(false)

  useEffect(() => {
    getListingById(id)
      .then(data => {
        setListing(data)
        document.title = `${data.title} — ${formatPrice(data.price)} | NOUT 974`
        if (data.category) {
          setLoadingSimilar(true)
          getSimilarListings(data.category, data.id)
            .then(setSimilar)
            .catch(() => {})
            .finally(() => setLoadingSimilar(false))
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    return () => { document.title = 'NOUT — Marketplace seconde main La Réunion 974' }
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Supprimer cette annonce définitivement ?')) return
    setDeleting(true)
    try {
      await deleteListing(id)
      navigate('/')
    } catch {
      alert('Erreur lors de la suppression.')
      setDeleting(false)
    }
  }

  const handleMarkVendu = async () => {
    if (!confirm('Marquer cet article comme vendu ? Il ne sera plus visible dans les recherches.')) return
    setMarkingVendu(true)
    try {
      const updated = await updateListing(id, { is_sold: true })
      setListing(prev => ({ ...prev, ...updated }))
    } catch {
      alert('Erreur. Réessaie.')
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
      <p className="text-5xl mb-4">🔍</p>
      <p className="text-lg font-semibold text-nout-dark">Annonce introuvable</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Retour à l'accueil</button>
    </div>
  )

  const isOwner    = user?.id === listing.user_id
  const category   = CATEGORIES.find(c => c.id === listing.category)
  const condition  = CONDITIONS.find(c => c.id === listing.condition)

  const fraisFixe      = 1.00
  const fraisVariable  = listing.price * 0.05
  const totalAcheteur  = listing.price + fraisFixe + fraisVariable
  const images     = listing.images?.length > 0 ? listing.images : null
  const seller     = listing.profiles
  const isSellerActive = listing.created_at &&
    Date.now() - new Date(listing.created_at).getTime() < 30 * 24 * 60 * 60 * 1000

  const handleSendOffer = async () => {
    const amount = parseFloat(offerAmount)
    if (!amount || amount <= 0) return
    setOfferSending(true)
    try {
      await sendMessage({
        senderId: user.id,
        receiverId: seller.id,
        listingId: id,
        content: `💰 Offre : ${amount} €\nPour l'annonce : ${listing.title}`,
        senderName: profile?.username,
      })
      setShowOffer(false)
      setOfferAmount('')
      navigate(`/messages/${seller.id}?annonce=${id}`)
    } catch {
      alert("Erreur lors de l'envoi de l'offre.")
    } finally {
      setOfferSending(false)
    }
  }

  const whatsappUrl =`https://wa.me/?text=${encodeURIComponent(`${listing.title} — ${formatPrice(listing.price)} | NOUT 974\n${window.location.href}`)}`

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── GALERIE ── */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            {images ? (
              <img
                src={images[photoIdx]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl text-gray-300">📷</div>
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
                  <img src={url} alt="" className="w-full h-full object-cover" />
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
            {category && (
              <span className="bg-orange-50 text-nout-primary text-xs font-medium px-3 py-1 rounded-full">
                {category.icon} {category.label}
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
            <h1 className="text-2xl font-extrabold text-nout-dark leading-snug">{listing.title}</h1>
            <p className="text-3xl font-extrabold text-nout-primary mt-2">{formatPrice(listing.price)}</p>
          </div>

          {/* Lieu + date + vues */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
            <span>📍 {listing.city}</span>
            <span>🕒 {formatRelativeDate(listing.created_at)}</span>
            <span>👁 {listing.views ?? 0} vue{listing.views !== 1 ? 's' : ''}</span>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-nout-dark mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          )}

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
                <p className="font-semibold text-nout-dark">{seller.username}</p>
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

          {/* Boutons d'action — PROPRIÉTAIRE */}
          {isOwner ? (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/annonce/${id}/modifier`)}
                  className="btn-secondary flex-1"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 bg-red-50 text-red-500 border-2 border-red-200 rounded-nout font-bold hover:bg-red-100 transition-all disabled:opacity-60"
                >
                  {deleting ? 'Suppression…' : '🗑 Supprimer'}
                </button>
              </div>
              {!listing.is_sold && (
                <button
                  onClick={handleMarkVendu}
                  disabled={markingVendu}
                  className="w-full px-6 py-3 bg-green-50 text-green-600 border-2 border-green-200 rounded-nout font-bold hover:bg-green-100 transition-all disabled:opacity-60"
                >
                  {markingVendu ? 'Mise à jour…' : '✅ Marquer comme vendu'}
                </button>
              )}
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
                  {/* Récapitulatif des frais */}
                  <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-100 space-y-2">
                    <div className="flex justify-between text-gray-500">
                      <span>Prix de l'article</span>
                      <span>{formatPrice(listing.price)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Frais de service</span>
                      <span>{formatPrice(fraisFixe)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Frais de traitement sécurisé</span>
                      <span>{formatPrice(fraisVariable)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-nout-dark">
                      <span>Total</span>
                      <span>{formatPrice(totalAcheteur)}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setPaying(true)
                      setPayError('')
                      try {
                        const res = await fetch('/.netlify/functions/create-checkout-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ listingId: id, buyerId: user.id }),
                        })
                        const data = await res.json()
                        if (data.error) { setPayError(data.error); return }
                        window.location.href = data.url
                      } catch {
                        setPayError('Erreur de connexion. Réessaie.')
                      } finally {
                        setPaying(false)
                      }
                    }}
                    disabled={paying}
                    className={`btn-primary w-full py-4 text-base ${paying ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {paying ? 'Redirection…' : `💳 Acheter — ${formatPrice(totalAcheteur)}`}
                  </button>
                  <button
                    onClick={() => setShowOffer(true)}
                    className="w-full py-3 rounded-nout border-2 border-[#00C4B4] text-[#00C4B4] font-bold text-sm hover:bg-[#00C4B4] hover:text-white transition-all"
                  >
                    💰 Faire une offre
                  </button>
                  <button
                    onClick={() => navigate(`/messages/${seller?.id}?annonce=${id}`)}
                    className="btn-secondary w-full py-3 text-sm"
                  >
                    💬 Contacter le vendeur
                  </button>
                </>
              ) : (
                <Link to="/connexion" className="btn-primary w-full py-4 text-base text-center">
                  💬 Contacter le vendeur
                </Link>
              )}
            </div>
          )}

          {/* Signaler */}
          {user && !isOwner && (
            <button
              onClick={() => setShowReport(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors text-center mt-1"
            >
              🚩 Signaler cette annonce
            </button>
          )}

          {/* Partage WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-nout border-2 border-[#25D366] text-[#25D366] font-semibold text-sm hover:bg-[#25D366] hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Partager sur WhatsApp
          </a>

        </div>
      </div>

      {/* ── ANNONCES SIMILAIRES ── */}
      {(loadingSimilar || similar.length > 0) && (
        <div className="mt-12">
          <h2 className="text-xl font-extrabold text-nout-dark mb-4">Annonces similaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {loadingSimilar
              ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
              : similar.map(l => <ListingCard key={l.id} listing={l} />)
            }
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal
          listingId={id}
          onClose={() => setShowReport(false)}
        />
      )}

      {showOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-nout-dark mb-1">💰 Faire une offre</h3>
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
    </div>
  )
}
