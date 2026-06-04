import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyOrders } from '../services/orders'
import { formatPrice, formatDate } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'

const STATUS_LABELS = {
  pending:   { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700' },
  paid:      { label: 'Payé',        color: 'bg-blue-100 text-blue-700' },
  shipped:   { label: 'Expédié',     color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livré',       color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé',      color: 'bg-gray-100 text-gray-500' },
  disputed:  { label: 'Litige',      color: 'bg-red-100 text-red-600' },
}

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('achats')

  useEffect(() => {
    getMyOrders(user.id)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user.id])

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  const achats = orders.filter(o => o.buyer_id === user.id)
  const ventes = orders.filter(o => o.seller_id === user.id)
  const liste  = tab === 'achats' ? achats : ventes

  return (
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
            const status  = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' }
            const image   = order.listing?.images?.[0]
            const other   = tab === 'achats' ? order.seller : order.buyer
            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
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
                  <Link to={`/annonce/${order.listing?.id}`}>
                    <p className="font-semibold text-nout-dark text-sm truncate hover:text-nout-primary transition-colors">
                      {order.listing?.title ?? 'Article supprimé'}
                    </p>
                  </Link>
                  <p className="text-nout-primary font-extrabold mt-0.5">{formatPrice(order.total_price)}</p>
                  {other && (
                    <p className="text-xs text-gray-400 mt-1">
                      {tab === 'achats' ? 'Vendeur' : 'Acheteur'} : {other.username}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                </div>

                {/* Statut */}
                <div className="flex-shrink-0">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
