import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { path: '/admin',              label: 'Dashboard',      icon: '📊' },
  { path: '/admin/annonces',     label: 'Annonces',       icon: '📦' },
  { path: '/admin/utilisateurs', label: 'Utilisateurs',   icon: '👥' },
  { path: '/admin/commandes',    label: 'Commandes',      icon: '🛒' },
  { path: '/admin/signalements', label: 'Signalements',   icon: '🚨' },
  { path: '/admin/finances',     label: 'Finances',       icon: '💰' },
  { path: '/admin/rgpd',         label: 'RGPD',           icon: '🔒' },
  { path: '/admin/parametres',   label: 'Paramètres',     icon: '⚙️' },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="flex min-h-screen bg-nout-light">
      {/* Sidebar */}
      <aside className="w-56 bg-nout-dark text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-700">
          <Link to="/" className="text-xl font-bold text-nout-primary">NOUT</Link>
          <p className="text-xs text-gray-400 mt-0.5">Panel Admin</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(({ path, label, icon }) => {
            const isActive = path === '/admin' ? pathname === '/admin' : pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-nout-primary text-white font-semibold'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <Link to="/" className="block text-xs text-gray-400 hover:text-white mb-2">← Retour au site</Link>
          <button onClick={handleLogout} className="text-xs text-nout-error hover:underline">Déconnexion</button>
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
