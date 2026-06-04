import { Link } from 'react-router-dom'
import { formatPrice, formatRelativeDate } from '../../utils/formatters'

export default function ListingCard({ listing }) {
  const imageUrl = listing.images?.[0] ?? null

  return (
    <Link to={`/annonce/${listing.id}`} className="card group block">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
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
