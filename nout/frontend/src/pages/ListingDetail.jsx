import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getListingById, deleteListing } from '../services/listings'
import { formatPrice, formatRelativeDate } from '../utils/formatters'
import { CATEGORIES, CONDITIONS } from '../utils/categories'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'

export default function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [listing, setListing]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [paying,   setPaying]   = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    getListingById(id)
      .then(setListing)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
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

  if (loading) return (
    <div className="flex justify-center py-24"><Spinner size="lg" /></div>
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
  const images     = listing.images?.length > 0 ? listing.images : null
  const seller     = listing.profiles

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
              <div className="w-12 h-12 rounded-full bg-nout-primary text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                {seller.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="font-semibold text-nout-dark">{seller.username}</p>
                <p className="text-xs text-gray-400">Membre depuis {formatRelativeDate(seller.created_at)}</p>
              </div>
              <span className="ml-auto text-gray-300">›</span>
            </Link>
          )}

          {/* Boutons d'action */}
          {isOwner ? (
            <div className="flex gap-3 mt-2">
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
          ) : listing.is_sold ? (
            <div className="bg-gray-100 text-gray-500 text-center rounded-xl py-4 font-semibold">
              Cet article a déjà été vendu
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {payError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {payError}
                </div>
              )}
              {user ? (
                <>
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
                    {paying ? 'Redirection…' : `💳 Acheter — ${formatPrice(listing.price)}`}
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

        </div>
      </div>
    </div>
  )
}
