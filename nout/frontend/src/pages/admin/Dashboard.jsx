import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { listPendingPayouts, payPendingPayouts } from '../../lib/adminApi'

const formatPrice = (n) => `${Number(n ?? 0).toFixed(2)} €`

const StatCard = ({ icon, label, value, to, color = 'text-nout-primary' }) => (
  <Link to={to} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow block">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-3xl font-extrabold mt-1 ${color}`}>{value ?? '…'}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </Link>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState({})
  // Paiements vendeurs en attente : liste + sélection (cases à cochées) + résultat.
  const [pending, setPending]   = useState([])          // commandes à verser
  const [selected, setSelected] = useState(new Set())    // orderIds cochés
  const [loadingList, setLoadingList] = useState(true)
  const [paying, setPaying]     = useState(false)
  const [result, setResult]     = useState({ msg: '', error: '', details: [] })

  const loadPending = useCallback(async () => {
    setLoadingList(true)
    setResult({ msg: '', error: '', details: [] })
    try {
      const items = await listPendingPayouts()
      setPending(items)
      // Par défaut, on coche uniquement les vendeurs qui ONT un compte (versables).
      setSelected(new Set(items.filter(i => i.compte).map(i => i.orderId)))
    } catch (e) {
      setResult({ msg: '', error: e.message || 'Impossible de charger les paiements.', details: [] })
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  const toggle = (orderId) => setSelected((cur) => {
    const next = new Set(cur)
    next.has(orderId) ? next.delete(orderId) : next.add(orderId)
    return next
  })

  const totalSelectionne = pending
    .filter(i => selected.has(i.orderId))
    .reduce((s, i) => s + Number(i.montant ?? 0), 0)

  const handlePaySelected = async () => {
    if (paying || selected.size === 0) return
    setPaying(true)
    setResult({ msg: '', error: '', details: [] })
    try {
      const res = await payPendingPayouts([...selected])
      const msg = `${res.released} vendeur(s) payé(s) ✅${res.skipped ? ` · ${res.skipped} ignoré(s)` : ''}${res.errors ? ` · ${res.errors} erreur(s)` : ''}`
      setResult({ msg, error: '', details: res.details ?? [] })
      await loadPending()   // recharge la liste (les payés disparaissent)
    } catch (e) {
      setResult({ msg: '', error: e.message || 'Erreur lors du versement.', details: [] })
    } finally {
      setPaying(false)
    }
  }

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_sold', false),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      // Ventes VRAIMENT conclues = commandes finalisées (vendeur payé), pas les annonces marquées vendues.
      // Exclut donc automatiquement les tests annulés et les annonces "is_sold" sans transaction terminée.
      supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['completed', 'payout_pending']),
    ]).then(([users, listings, orders, reports, sold]) => {
      setStats({
        users:    users.count    ?? 0,
        listings: listings.count ?? 0,
        orders:   orders.count   ?? 0,
        reports:  reports.count  ?? 0,
        sold:     sold.count     ?? 0,
      })
    }).catch((err) => console.error('[admin] chargement des stats du tableau de bord échoué :', err?.message))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="" label="Utilisateurs"      value={stats.users}    to="/admin/utilisateurs" />
        <StatCard icon="" label="Annonces actives"  value={stats.listings} to="/admin/annonces" />
        <StatCard icon="" label="Ventes conclues"   value={stats.sold}     to="/admin/commandes" color="text-green-600" />
        <StatCard icon="" label="Signalements"      value={stats.reports}  to="/admin/signalements" color={stats.reports > 0 ? 'text-red-500' : 'text-nout-primary'} />
      </div>

      {/* Paiements vendeurs : liste + sélection. L'admin VOIT tout et CHOISIT qui payer (argent = contrôle
          humain). Filet quand le cron de versement ne s'exécute pas. Versement idempotent (jamais 2×). */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <div>
            <h2 className="font-bold text-nout-dark">Paiements vendeurs en attente</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Colis livrés, délai de protection écoulé. Coche qui tu veux payer, puis verse.
            </p>
          </div>
          <button
            onClick={loadPending}
            disabled={loadingList || paying}
            className="text-sm text-gray-400 hover:text-nout-primary transition-colors"
          >
            ↻ Rafraîchir
          </button>
        </div>

        {loadingList ? (
          <p className="text-sm text-gray-400 py-4">Chargement…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Aucun paiement en attente. Tout est à jour ✅</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-100">
                    <th className="py-2 pr-2 w-8"></th>
                    <th className="py-2 pr-3 font-medium">Vendeur</th>
                    <th className="py-2 pr-3 font-medium">Article</th>
                    <th className="py-2 pr-3 font-medium text-right">Montant</th>
                    <th className="py-2 pr-3 font-medium">Compte de paiement</th>
                    <th className="py-2 pr-3 font-medium">Livré</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((it) => {
                    const noCompte = !it.compte
                    return (
                      <tr key={it.orderId} className={`border-b border-gray-50 ${noCompte ? 'opacity-70' : ''}`}>
                        <td className="py-2.5 pr-2">
                          <input
                            type="checkbox"
                            checked={selected.has(it.orderId)}
                            disabled={noCompte}
                            onChange={() => toggle(it.orderId)}
                            className="w-4 h-4 accent-nout-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold text-nout-dark">{it.vendeur}</div>
                          <div className="text-[11px] text-gray-400">{it.email}</div>
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600">{it.article}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-nout-dark tabular-nums">
                          {it.montant != null ? formatPrice(it.montant) : '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          {noCompte ? (
                            <span className="text-[11px] font-semibold text-red-500">⚠ Compte non activé — argent bloqué</span>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-mono">{String(it.compte).slice(0, 14)}…</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">
                          {it.joursDepuisLivraison != null
                            ? (it.joursDepuisLivraison === 0 ? "aujourd'hui" : `il y a ${it.joursDepuisLivraison} j`)
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap mt-4 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                <strong>{selected.size}</strong> sélectionné(s) · total à verser :{' '}
                <strong className="text-nout-dark">{formatPrice(totalSelectionne)}</strong>
              </p>
              <button
                onClick={handlePaySelected}
                disabled={paying || selected.size === 0}
                className="px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #0E7FAB, #00C4B4)' }}
              >
                {paying ? 'Versement en cours…' : `Verser les ${selected.size} sélectionné(s)`}
              </button>
            </div>
          </>
        )}

        {result.msg && <p className="text-sm text-green-600 mt-3 font-medium">{result.msg}</p>}
        {result.error && <p className="text-sm text-red-500 mt-3">{result.error}</p>}
        {result.details?.length > 0 && (
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-0.5">
            {result.details.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières annonces */}
        <RecentListings />
        {/* Derniers inscrits */}
        <RecentUsers />
      </div>
    </div>
  )
}

function RecentListings() {
  const [items, setItems] = useState([])
  useEffect(() => {
    supabase.from('listings')
      .select('id, title, price, created_at, is_active, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setItems(data ?? []))
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-nout-dark">Dernières annonces</h2>
        <Link to="/admin/annonces" className="text-xs text-nout-primary hover:underline">Voir tout</Link>
      </div>
      <div className="flex flex-col gap-3">
        {items.map(l => (
          <Link key={l.id} to={`/admin/annonces/${l.id}`} className="flex justify-between items-center text-sm hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
            <div>
              <p className="font-medium text-nout-dark truncate max-w-[180px]">{l.title}</p>
              <p className="text-xs text-gray-400">{l.profiles?.username}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-nout-primary">{l.price} €</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {l.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function RecentUsers() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    // Données sensibles (email) via la RPC admin sécurisée — pas via la table publique.
    supabase.rpc('admin_accounts')
      .then(({ data }) => setUsers(
        (data ?? [])
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      ))
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-nout-dark">Derniers inscrits</h2>
        <Link to="/admin/utilisateurs" className="text-xs text-nout-primary hover:underline">Voir tout</Link>
      </div>
      <div className="flex flex-col gap-3">
        {users.map(u => (
          <Link key={u.id} to={`/admin/utilisateurs/${u.id}`} className="flex justify-between items-center text-sm hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
            <div>
              <p className="font-medium text-nout-dark">{u.username}</p>
              <p className="text-xs text-gray-400 truncate max-w-[180px]">{u.email}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
              u.role === 'admin'     ? 'bg-red-100 text-red-600' :
              u.role === 'moderator' ? 'bg-orange-100 text-orange-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {u.role}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
