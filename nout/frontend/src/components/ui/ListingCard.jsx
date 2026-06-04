import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../services/favorites'
import { formatPrice, formatRelativeDate } from '../../utils/formatters'

export default function ListingCard({ listing, isFavorited = false }) {
  const { user } = useAuth()
  const [fav, setFav] = useState(isFavorited)
  const [toggling, setToggling] = useState(false)

  const imageUrl = listing.images?.[0] ?? null

  const handleFav = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || toggling) return
    setToggling(true)
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
    <Link to={`/annonce/${listing.id}`} className="card group block relative">

      {/* Bouton cœur */}
      {user && (
        <button
          onClick={handleFav}
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition-transform"
        >
          <svg
            className={`w-4 h-4 transition-colors ${fav ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-gray-400 group-hover:stroke-red-400'}`}
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      )}

      <div className="aspect-square bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
            📷
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-nout-dark line-clamp-2 mb-1 leading-snug">
          {listing.title}
        </p>
        <p className="text-nout-primary font-bold text-base">
          {formatPrice(listing.price)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {listing.city} · {formatRelativeDate(listing.created_at)}
        </p>
      </div>
    </Link>
  )
}
