import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Shield, Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../services/favorites'
import { formatPrice, formatRelativeDate } from '../../utils/formatters'
import { CATEGORIES, CONDITIONS } from '../../utils/categories'
import CategoryIcon from './CategoryIcon'

export default function ListingCard({ listing, isFavorited = false }) {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [fav, setFav]         = useState(isFavorited)
  const [toggling, setToggling] = useState(false)
  const [pulse, setPulse]     = useState(false)

  const rawImage  = listing.images?.[0] ?? null
  const imageUrl  = rawImage?.includes('supabase.co/storage')
    ? `${rawImage}?width=400&height=400&resize=cover`
    : rawImage
  const category      = CATEGORIES.find(c => c.id === listing.category)
  const conditionLabel = CONDITIONS.find(c => c.id === listing.condition)?.label
  const views         = listing.views ?? 0
  const totalAcheteur = Math.round((listing.price * 1.05 + 1) * 100) / 100

  const handleFav = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (toggling) return
    if (!user) { navigate('/connexion'); return }
    setToggling(true)
    setPulse(true)
    setTimeout(() => setPulse(false), 400)
    const next = !fav
    setFav(next)
    try {
      if (next) await addFavorite(user.id, listing.id)
      else      await removeFavorite(user.id, listing.id)
    } catch {
      setFav(!next)
    } finally {
      setToggling(false)
    }
  }

  return (
    <Link
      to={`/annonce/${listing.id}`}
      className="group relative block bg-white rounded-[16px] overflow-hidden border border-[#D6E0F5] shadow-nout-md transition-all duration-300 hover:-translate-y-1 hover:shadow-nout-hover hover:border-nout-turquoise"
    >
      {/* ── IMAGE ── */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <Camera size={36} strokeWidth={1} />
          </div>
        )}

        {/* Badge catégorie — haut gauche */}
        {category && (
          <span className="absolute top-2 left-2 bg-nout-turquoise text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight flex items-center gap-1">
            <CategoryIcon id={listing.category} size={10} />
            <span className="hidden sm:inline">{category.label}</span>
          </span>
        )}

        {/* Badge VENDU */}
        {listing.is_sold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-nout-texte text-xs font-bold px-3 py-1 rounded-full tracking-wider uppercase">
              Vendu
            </span>
          </div>
        )}

        {/* Cœur favori — haut droite */}
        <button
          onClick={handleFav}
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-transform ${pulse ? 'scale-125' : 'hover:scale-110'}`}
        >
          <Heart className={`w-4 h-4 transition-all duration-200 ${fav ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-white'}`} />
        </button>
      </div>

      {/* ── INFOS ── */}
      <div className="p-3">
        {listing.brand ? (
          <p className="text-[12px] font-semibold text-nout-texte leading-tight truncate mb-0.5">
            {listing.brand}
          </p>
        ) : (
          <p className="text-[12px] font-medium text-nout-texte line-clamp-2 leading-snug mb-0.5">
            {listing.title}
          </p>
        )}

        {(listing.size || conditionLabel) && (
          <p className="text-[10px] text-nout-muted truncate mb-1.5">
            {[listing.size, conditionLabel].filter(Boolean).join(' · ')}
          </p>
        )}

        <p className="font-title font-bold text-[15px] leading-tight text-nout-texte">
          {formatPrice(listing.price)}
        </p>

        <p className="flex items-center gap-0.5 text-[10px] text-nout-turquoise mt-0.5">
          <Shield size={9} />
          {formatPrice(totalAcheteur)} frais inclus
        </p>

        <p className="text-[10px] text-nout-muted mt-1.5">
          {views > 0 ? `${views} vu${views > 1 ? 's' : ''} · ` : ''}
          {formatRelativeDate(listing.created_at)}
        </p>
      </div>
    </Link>
  )
}
