import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../services/supabase'
import { formatPrice, formatRelativeDate } from '../../../utils/formatters'

const STATUS = {
  pending:        { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700' },
  paid:           { label: 'Payée',       color: 'bg-blue-100 text-blue-700' },
  shipped:        { label: 'Expédiée',    color: 'bg-purple-100 text-purple-700' },
  completed:      { label: 'Terminée',    color: 'bg-green-100 text-green-700' },
  payout_pending: { label: 'Virement en attente', color: 'bg-amber-100 text-amber-700' },
  refunded:       { label: 'Remboursée',  color: 'bg-gray-100 text-gray-500' },
  cancelled:      { label: 'Annulée',     color: 'bg-gray-100 text-gray-500' },
  disputed:       { label: 'Litige',      color: 'bg-red-100 text-red-600' },
}

export default function OrdersList() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [busy,    setBusy]    = useState(null)

  const load = useCallback(() => {
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

  useEffect(() => { load() }, [load])

  // Résolution d'un litige (admin) : rembourse l'acheteur OU libère le paiement au vendeur.
  const resolve = async (orderId, action) => {
    if (busy) return
    const verb = action === 'resolve_dispute_refund'
      ? "REMBOURSER l'acheteur"
      : 'LIBÉRER le paiement au vendeur'
    if (!window.confirm(`Litige — confirmer : ${verb} pour cette commande ?\nVérifie d'abord sur Stripe qu'aucun mouvement n'est déjà parti.`)) return
    setBusy(orderId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/admin-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ action, targetId: orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

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
                <th className="px-4 py-3 text-left">Actions</th>
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
                    <td className="px-4 py-3">
                      {o.status === 'disputed' ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => resolve(o.id, 'resolve_dispute_refund')}
                            disabled={busy === o.id}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            {busy === o.id ? '…' : 'Rembourser'}
                          </button>
                          <button
                            onClick={() => resolve(o.id, 'resolve_dispute_release')}
                            disabled={busy === o.id}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {busy === o.id ? '…' : 'Libérer'}
                          </button>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
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
