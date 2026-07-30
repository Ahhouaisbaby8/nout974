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

// Fenêtre de protection acheteur : le versement auto part 48h APRÈS la livraison constatée.
const RECEIPT_WINDOW_H = 48

// État du VERSEMENT VENDEUR d'une commande : a-t-il reçu / dans combien de temps ?
// Déduit du statut + delivered_at (pas d'appel Stripe → instantané pour toute la liste).
function payoutState(o) {
  switch (o.status) {
    case 'completed':
      return { label: 'Vendeur payé', sub: 'versement effectué', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
    case 'payout_pending':
      return { label: 'Versement en cours', sub: 'en route vers le vendeur', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
    case 'delivered': {
      // Livré → payé automatiquement 48h après. On affiche le temps restant.
      if (!o.delivered_at) return { label: 'Bientôt', sub: 'livré, versement sous 48h', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
      const dueAt = new Date(o.delivered_at).getTime() + RECEIPT_WINDOW_H * 3600 * 1000
      const msLeft = dueAt - Date.now()
      if (msLeft <= 0) return { label: 'Imminent', sub: 'délai écoulé, versement au prochain passage', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
      const hLeft = Math.ceil(msLeft / 3600000)
      const when = hLeft >= 24 ? `sous ${Math.ceil(hLeft / 24)} j` : `sous ${hLeft} h`
      return { label: `Versement ${when}`, sub: 'après le délai de protection 48h', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' }
    }
    case 'paid':
    case 'shipped':
      return { label: 'En attente de livraison', sub: 'argent sécurisé chez NOUT', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
    case 'disputed':
      return { label: 'Suspendu (litige)', sub: 'versement bloqué', color: 'bg-red-100 text-red-600', dot: 'bg-red-500' }
    case 'refunded':
      return { label: 'Remboursé', sub: 'acheteur remboursé', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
    case 'cancelled':
      return { label: 'Rien à verser', sub: 'commande annulée', color: 'bg-gray-100 text-gray-400', dot: 'bg-gray-300' }
    default:
      return { label: '—', sub: '', color: 'bg-gray-100 text-gray-400', dot: 'bg-gray-300' }
  }
}

// État du DÉLAI avant annulation auto (le vendeur a 7 j pour remettre/expédier).
// Ne concerne que les commandes 'paid' (en attente) : ailleurs, le délai n'a plus lieu d'être.
function delaiState(o) {
  if (o.status === 'cancelled')
    return { label: 'annulée — délai dépassé', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' }
  if (['shipped', 'delivered', 'completed', 'payout_pending'].includes(o.status))
    return { label: 'remis à temps', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
  if (o.status === 'refunded')
    return { label: 'remboursée', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
  if (o.status !== 'paid' || !o.expires_at)
    return { label: '—', color: 'bg-gray-100 text-gray-400', dot: 'bg-gray-300' }

  const msLeft = new Date(o.expires_at).getTime() - Date.now()
  if (msLeft <= 0)
    return { label: 'délai écoulé', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' }
  const hLeft = Math.ceil(msLeft / 3600000)
  if (hLeft <= 24)
    return { label: `bientôt — ${hLeft} h`, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
  const dLeft = Math.ceil(hLeft / 24)
  return { label: `${dLeft} j restants`, color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
}

export default function OrdersList() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [busy,    setBusy]    = useState(null)
  const [diag,    setDiag]    = useState(null)   // état factuel lu directement en base (fraîcheur)
  const [diagLoading, setDiagLoading] = useState(false)

  // Chargement des commandes VIA LE SERVEUR (service key) : contourne la RLS qui, en lecture
  // navigateur, masquait des commandes (bug « il manque des lignes récentes »). La même réponse
  // alimente l'encart de fraîcheur ET le tableau → un seul appel, tout cohérent.
  const load = useCallback(async () => {
    setLoading(true)
    setDiagLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/admin-orders-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ status: filter }),
      })
      const data = await res.json()
      if (res.ok) {
        setDiag(data)
        setOrders((data.orders ?? []).map(o => ({
          id: o.id,
          total_price: o.montant,
          status: o.statut,
          created_at: o.date,
          delivered_at: o.delivered_at,
          seller_payout: o.seller_payout,
          expires_at: o.expires_at,
          buyer:    { username: o.acheteur !== '—' ? o.acheteur : null },
          seller:   { username: o.vendeur  !== '—' ? o.vendeur  : null },
          listings: { title:    o.article  !== '—' ? o.article  : null },
        })))
      }
    } catch { /* silencieux */ }
    finally { setLoading(false); setDiagLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])
  const runDiag = load   // le bouton « Rafraîchir » relance le même chargement complet

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
      <h1 className="text-2xl font-extrabold text-nout-dark mb-4">Commandes</h1>

      {/* Encart FRAÎCHEUR : confirme, chiffres à l'appui, que la page reflète bien la base en direct.
          Lu via la fonction serveur (service key) → aucune commande ne peut y échapper. */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {diag ? (
          <>
            <div>
              <span className="text-gray-400">Total commandes&nbsp;: </span>
              <span className="font-bold text-nout-dark">{diag.total}</span>
            </div>
            <div>
              <span className="text-gray-400">7 derniers jours&nbsp;: </span>
              <span className={`font-bold ${diag.recent7 > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{diag.recent7}</span>
            </div>
            <div>
              <span className="text-gray-400">30 derniers jours&nbsp;: </span>
              <span className={`font-bold ${diag.recent30 > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{diag.recent30}</span>
            </div>
            <div>
              <span className="text-gray-400">Dernière commande&nbsp;: </span>
              <span className="font-bold text-nout-dark">
                {diag.mostRecent
                  ? new Date(diag.mostRecent).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'aucune'}
              </span>
            </div>
            <button
              onClick={runDiag}
              disabled={diagLoading}
              className="ml-auto text-xs font-semibold text-nout-primary hover:underline disabled:opacity-50"
            >
              {diagLoading ? 'Vérification…' : 'Rafraîchir'}
            </button>
          </>
        ) : (
          <span className="text-gray-400 text-xs">{diagLoading ? 'Lecture de la base…' : 'Diagnostic indisponible.'}</span>
        )}
      </div>

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
                <th className="px-4 py-3 text-left">Délai avant annulation</th>
                <th className="px-4 py-3 text-left">Versement vendeur</th>
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
                    <td className="px-4 py-3">
                      {(() => {
                        const dl = delaiState(o)
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dl.dot}`} />
                            <span className={`text-xs px-2 py-1 rounded-full ${dl.color}`}>{dl.label}</span>
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const p = payoutState(o)
                        return (
                          <span className="inline-flex items-center gap-1.5" title={p.sub}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                            <span className={`text-xs px-2 py-1 rounded-full ${p.color}`}>{p.label}</span>
                          </span>
                        )
                      })()}
                    </td>
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
