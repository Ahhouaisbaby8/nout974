import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyOrders } from '../services/orders'
import { formatPrice, formatDate } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'
import EscrowConfirm from '../components/EscrowConfirm'
import { supabase } from '../services/supabase'

const STATUS_LABELS = {
  pending:        { label: 'En attente',          color: 'bg-yellow-100 text-yellow-700' },
  paid:           { label: 'Paiement reçu',        color: 'bg-blue-100 text-blue-700' },
  completed:      { label: 'Remise faite',          color: 'bg-green-100 text-green-700' },
  payout_pending: { label: 'Virement en attente',  color: 'bg-orange-100 text-orange-700' },
  refunded:       { label: 'Remboursé',             color: 'bg-gray-100 text-gray-500' },
  shipped:        { label: 'Expédié',               color: 'bg-purple-100 text-purple-700' },
  delivered:      { label: 'Livré',                 color: 'bg-green-100 text-green-700' },
  cancelled:      { label: 'Annulé',                color: 'bg-gray-100 text-gray-500' },
  disputed:       { label: 'Litige',                color: 'bg-red-100 text-red-600' },
}

const STAR_LABELS = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent !']

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="p-1 transition-transform hover:scale-110"
        >
          <svg
            className={`w-9 h-9 transition-colors ${i <= display ? 'fill-[#0E7FAB] stroke-[#0E7FAB]' : 'fill-none stroke-gray-300'}`}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function ReviewModal({ order, onClose, onSubmitted }) {
  const [rating, setRating]     = useState(0)
  const [comment, setComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/submit-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ order_id: order.id, rating, comment: comment.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      onSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-title font-extrabold text-[18px] text-nout-dark mb-1">
          Comment s'est passée la transaction ?
        </h3>
        <p className="text-xs text-gray-400 mb-5">{order.listing?.title ?? 'Article'}</p>

        <StarPicker value={rating} onChange={setRating} />

        {rating > 0 ? (
          <p className="text-center text-sm font-semibold text-[#0E7FAB] mt-2 mb-4">
            {STAR_LABELS[rating]}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        <textarea
          rows={3}
          placeholder="Décris ton expérience (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          className="input-field resize-none mb-1 text-sm"
        />
        <p className="text-xs text-gray-400 text-right mb-4">{comment.length}/500</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 py-3 rounded-xl bg-[#1A3A8F] text-white text-sm font-semibold hover:bg-[#0E7FAB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Publication…' : 'Publier mon avis'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set())
  const [reviewTarget, setReviewTarget]   = useState(null)

  const tab = searchParams.get('tab') === 'ventes' ? 'ventes' : 'achats'
  const setTab = (t) => {
    setSearchParams({ tab: t }, { replace: true })
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    getMyOrders(user.id)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user.id])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('reviews')
      .select('order_id')
      .eq('reviewer_id', user.id)
      .then(({ data }) => setReviewedOrderIds(new Set((data ?? []).map(r => r.order_id))))
  }, [user.id])

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  const achats = orders.filter(o => o.buyer_id === user.id)
  const ventes = orders.filter(o => o.seller_id === user.id)
  const liste  = tab === 'achats' ? achats : ventes

  return (
    <>
      {reviewTarget && (
        <ReviewModal
          order={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setReviewedOrderIds(prev => new Set([...prev, reviewTarget.id]))
            setReviewTarget(null)
          }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Mes commandes</h1>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b border-nout-border">
          <button
            onClick={() => setTab('achats')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'achats' ? 'border-nout-primary text-nout-primary' : 'border-transparent text-gray-400'
            }`}
          >
            Mes achats ({achats.length})
          </button>
          <button
            onClick={() => setTab('ventes')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'ventes' ? 'border-nout-primary text-nout-primary' : 'border-transparent text-gray-400'
            }`}
          >
            Mes ventes ({ventes.length})
          </button>
        </div>

        {liste.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">{tab === 'achats' ? '🛍️' : '📦'}</p>
            <p className="text-base font-semibold text-nout-dark">
              {tab === 'achats' ? "Tu n'as pas encore effectué d'achat." : "Tu n'as pas encore réalisé de vente."}
            </p>
            {tab === 'achats' && (
              <Link to="/recherche" className="btn-primary mt-6 px-8 inline-block">
                Parcourir les annonces
              </Link>
            )}
            {tab === 'ventes' && (
              <Link to="/publier" className="btn-primary mt-6 px-8 inline-block">
                Publier une annonce
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {liste.map(order => {
              const status = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' }
              const image  = order.listing?.images?.[0]
              const other  = tab === 'achats' ? order.seller : order.buyer
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link to={`/annonce/${order.listing?.id}`} className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                        {image ? (
                          <img src={image} alt={order.listing?.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📷</div>
                        )}
                      </div>
                    </Link>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/annonce/${order.listing?.id}`} className="flex-1 min-w-0">
                          <p className="font-semibold text-nout-dark text-sm truncate hover:text-nout-primary transition-colors">
                            {order.listing?.title ?? 'Article supprimé'}
                          </p>
                        </Link>
                        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-nout-primary font-extrabold mt-0.5">{formatPrice(order.total_price)}</p>
                      {other && (
                        <p className="text-xs text-gray-400 mt-1">
                          {tab === 'achats' ? 'Vendeur' : 'Acheteur'} : {other.username}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                    </div>
                  </div>

                  {/* Confirmation escrow — visible uniquement pour le vendeur, statut paid */}
                  <EscrowConfirm
                    order={order}
                    onConfirmed={() => getMyOrders(user.id).then(setOrders).catch(() => {})}
                  />

                  {/* Bouton avis — visible pour l'acheteur, commande terminée */}
                  {tab === 'achats' && order.status === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {!reviewedOrderIds.has(order.id) ? (
                        <button
                          onClick={() => setReviewTarget(order)}
                          className="text-sm font-semibold text-[#0E7FAB] hover:text-[#1A3A8F] transition-colors flex items-center gap-1.5"
                        >
                          ⭐ Laisser un avis
                        </button>
                      ) : (
                        <p className="text-xs text-gray-400">✅ Avis publié</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
