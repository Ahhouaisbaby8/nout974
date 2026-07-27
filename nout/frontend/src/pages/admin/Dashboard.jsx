import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { releasePayouts } from '../../lib/adminApi'

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
  const [payout, setPayout] = useState({ loading: false, msg: '', error: '' })

  const handleReleasePayouts = async () => {
    if (payout.loading) return
    setPayout({ loading: true, msg: '', error: '' })
    try {
      const res = await releasePayouts()
      const msg = res.released > 0
        ? `${res.released} vendeur(s) payé(s) ✅${res.skipped ? ` · ${res.skipped} ignoré(s)` : ''}${res.errors ? ` · ${res.errors} erreur(s)` : ''}`
        : (res.message || 'Aucun paiement en attente à verser.')
      setPayout({ loading: false, msg, error: '' })
    } catch (e) {
      setPayout({ loading: false, msg: '', error: e.message || 'Erreur lors du versement.' })
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

      {/* Versement à la demande : verse les vendeurs en attente (livrés + délai écoulé). Filet quand
          le cron de versement automatique ne s'exécute pas. Réservé admin, versement idempotent. */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-nout-dark">Paiements vendeurs</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Verse les vendeurs dont le colis est livré et le délai de protection écoulé.
            </p>
          </div>
          <button
            onClick={handleReleasePayouts}
            disabled={payout.loading}
            className="px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #0E7FAB, #00C4B4)' }}
          >
            {payout.loading ? 'Versement en cours…' : 'Verser les paiements en attente'}
          </button>
        </div>
        {payout.msg && <p className="text-sm text-green-600 mt-3">{payout.msg}</p>}
        {payout.error && <p className="text-sm text-red-500 mt-3">{payout.error}</p>}
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
