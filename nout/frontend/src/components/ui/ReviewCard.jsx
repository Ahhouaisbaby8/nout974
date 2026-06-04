import { getAvatarUrl } from '../../utils/avatar'
import { formatRelativeDate } from '../../utils/formatters'

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'fill-yellow-400 stroke-yellow-400' : 'fill-none stroke-gray-300'}`}
          viewBox="0 0 24 24" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </div>
  )
}

export default function ReviewCard({ review }) {
  const buyer = review.buyer
  const avatarUrl = getAvatarUrl(buyer?.avatar_url)

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={buyer?.username} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-nout-primary text-white flex items-center justify-center text-sm font-bold">
              {buyer?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center flex-wrap gap-1">
            <span className="font-semibold text-nout-dark text-sm">{buyer?.username}</span>
            <span className="text-xs text-gray-400">{formatRelativeDate(review.created_at)}</span>
          </div>
          <Stars rating={review.rating} />
          {review.comment && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export { Stars }
