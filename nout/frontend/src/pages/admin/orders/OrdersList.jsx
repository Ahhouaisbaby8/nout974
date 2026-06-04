import { useState, useEffect } from 'react'
import { supabase } from '../../../services/supabase'
import { formatPrice, formatRelativeDate } from '../../../utils/formatters'

const STATUS = {
  pending:   { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700' },
  paid:      { label: 'Payée',       color: 'bg-blue-100 text-blue-700' },
  shipped:   { label: 'Expédiée',    color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livrée',      color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',     color: 'bg-gray-100 text-gray-500' },
  disputed:  { label: 'Litige',      color: 'bg-red-100 text-red-600' },
}

export default function OrdersList() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('orders')
      .select(`id, total_price, status, created_at,
        buyer:profiles!buyer_id(username),
        seller:profiles!seller_id(username),
        listings(title)`)
      .order('created_at', { ascending: false }).limit(50)
    if (filter !== 'all') q = q.eq('status', filter)
    q.then(({ data }) => setOrders(data ?? [])).finally(() => setLoading(false))
  }, [filter])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Commandes</h1>

      <div className="flex gap-2 flex-wrap mb-5">
        {[['all','Toutes'], ...Object.entries(STATUS).map(([k,v]) => [k, v.label])].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === val ? 'bg-nout-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Article</th>
                <th className="px-4 py-3 text-left">Acheteur</th>
                <th className="px-4 py-3 text-left">Vendeur</th>
                <th className="px-4 py-3 text-left">Montant</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => {
                const s = STATUS[o.status] ?? STATUS.pending
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-nout-dark max-w-[180px] truncate">{o.listings?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{o.buyer?.username ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{o.seller?.username ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-nout-primary">{formatPrice(o.total_price)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${s.color}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatRelativeDate(o.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Aucune commande.</p>}
        </div>
      )}
    </div>
  )
}
