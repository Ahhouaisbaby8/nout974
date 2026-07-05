import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getFavorites, removeFavorite } from '../services/favorites'
import { formatPrice, formatRelativeDate } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'
import SkeletonCard from '../components/ui/SkeletonCard'

export default function Favorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getFavorites(user.id)
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false))
  }, [user.id])

  const handleRemove = async (userId, listingId) => {
    try {
      await removeFavorite(userId, listingId)
      setFavorites(prev => prev.filter(f => f.listing_id !== listingId))
    } catch {
      // silencieux
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="h-8 w-40 bg-gray-200 rounded-full animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">
        Mes favoris
        {favorites.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-400">({favorites.length})</span>
        )}
      </h1>

      {favorites.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4"></p>
          <p className="text-base font-semibold text-nout-dark">Tu n'as pas encore de favoris</p>
          <p className="text-sm mt-2 text-gray-400">Explore les annonces et sauvegarde celles qui t'intéressent !</p>
          <Link to="/" className="btn-primary mt-6 px-8 inline-block">
            Explorer les annonces
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map(({ listing_id, listing, created_at }) => {
            if (!listing) return null
            const image = listing.images?.[0]
            return (
              <div key={listing_id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <Link to={`/annonce/${listing.id}`}>
                  <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                    {image ? (
                      <img src={image} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300"></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-nout-dark text-sm line-clamp-2">{listing.title}</p>
                    <p className="text-nout-primary font-extrabold mt-1">{formatPrice(listing.price)}</p>
                    <p className="text-xs text-gray-400 mt-1">{listing.city}</p>
                  </div>
                </Link>
                <div className="px-3 pb-3 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Ajouté {formatRelativeDate(created_at)}</span>
                  <button
                    onClick={() => handleRemove(user.id, listing_id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
