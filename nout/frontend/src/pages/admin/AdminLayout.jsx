import { useState } from 'react'
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
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="flex min-h-screen bg-nout-light">

      {/* ── HEADER MOBILE (hamburger) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-nout-dark text-white flex items-center px-4 gap-3 shadow-lg">
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="flex flex-col justify-center gap-1.5 w-8 h-8 flex-shrink-0"
        >
          <span className="block w-5 h-0.5 bg-white rounded-full" />
          <span className="block w-5 h-0.5 bg-white rounded-full" />
          <span className="block w-5 h-0.5 bg-white rounded-full" />
        </button>
        <Link to="/" className="text-base font-bold text-nout-primary">NOUT Admin</Link>
      </div>

      {/* ── OVERLAY MOBILE ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-56 bg-nout-dark text-white flex flex-col shrink-0
        transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-4 border-b border-gray-700">
          <Link to="/" className="text-xl font-bold text-nout-primary">NOUT</Link>
          <p className="text-xs text-gray-400 mt-0.5">Panel Admin</p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ path, label, icon }) => {
            const isActive = path === '/admin' ? pathname === '/admin' : pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
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

      {/* ── CONTENU ── */}
      <main className="flex-1 overflow-auto p-4 md:p-8 mt-14 md:mt-0">
        <Outlet />
      </main>

    </div>
  )
}
