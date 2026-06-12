import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getAvatarUrl } from '../../utils/avatar'

export default function Header() {
  const { user, profile, logout, isAdmin, unreadCount: unread } = useAuth()
  const navigate  = useNavigate()
  const [query, setQuery]     = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/recherche?q=${encodeURIComponent(query.trim())}`)
    else navigate('/recherche')
  }

  // Ferme le dropdown si clic en dehors
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const avatarUrl = getAvatarUrl(profile?.avatar_url)

  const menuLinks = [
    { to: `/profil/${user?.id}`,   icon: '👤', label: 'Mon profil' },
    { to: '/favoris', icon: <Heart className="w-4 h-4 text-red-500 fill-red-500" />, label: 'Mes favoris' },
    { to: '/commandes?tab=achats', icon: '🛍️', label: 'Mes achats' },
    { to: '/commandes?tab=ventes', icon: '📦', label: 'Mes ventes' },
    { to: '/parametres',           icon: '⚙️', label: 'Paramètres' },
  ]

  return (
    <header className="bg-white border-b border-[#E8EFF5] sticky top-0 z-50 shadow-nout-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">

        {/* ── LOGO ── */}
        <Link
          to="/"
          className="flex-shrink-0 mr-2 flex flex-col leading-none"
          onClick={() => {
            if (document.scrollingElement) document.scrollingElement.scrollTop = 0
            window.scrollTo(0, 0)
          }}
        >
          <span className="font-title font-black text-[20px] text-[#0A0F2C] tracking-[0.18em] leading-none">
            NOUT
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00C4B4] flex-shrink-0" />
            <span className="font-title font-semibold text-[7px] tracking-[0.26em] text-[#00C4B4] uppercase leading-none">
              La Réunion 974
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#00C4B4] flex-shrink-0" />
          </div>
        </Link>

        {/* ── BARRE DE RECHERCHE DESKTOP ── */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-sm items-center gap-2 bg-gray-50 border border-transparent rounded-full px-4 py-2 transition-all focus-within:border-nout-turquoise focus-within:bg-white focus-within:shadow-nout-sm"
        >
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher sur NOUT…"
            className="flex-1 bg-transparent outline-none text-sm text-nout-texte placeholder-gray-400 min-w-0"
          />
        </form>

        {/* ── NAV DESKTOP ── */}
        <nav className="hidden lg:flex items-center gap-5 text-[14px] ml-2">
          <Link to="/"                  className="text-nout-muted hover:text-nout-turquoise transition-colors font-medium">Accueil</Link>
          <Link to="/comment-ca-marche" className="text-nout-muted hover:text-nout-turquoise transition-colors font-medium">Comment ça marche</Link>
          <Link to="/a-propos"          className="text-nout-muted hover:text-nout-turquoise transition-colors font-medium">À propos</Link>
          <Link to="/aide"              className="text-nout-muted hover:text-nout-turquoise transition-colors font-medium">Aide</Link>
          {isAdmin && (
            <Link to="/admin" className="text-nout-roi font-semibold hover:text-nout-lagon transition-colors">
              Admin
            </Link>
          )}
        </nav>

        {/* ── ACTIONS ── */}
        <div className="ml-auto flex items-center gap-2">

          {user ? (
            <>
              {/* Bouton Vendre */}
              <Link
                to="/publier"
                className="hidden sm:flex items-center gap-1 px-4 py-2 text-white text-[13px] font-semibold rounded-full bg-nout-accent hover:opacity-90 transition-opacity"
              >
                <span className="text-base leading-none">+</span> Vendre
              </Link>

              {/* Icône messages avec badge */}
              <Link
                to="/messages"
                title="Messages"
                className="relative w-9 h-9 flex items-center justify-center rounded-full text-nout-muted hover:bg-gray-100 hover:text-nout-turquoise transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                </svg>
                {unread > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>

              {/* Avatar + dropdown menu */}
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex-shrink-0 focus:outline-none"
                  aria-label="Menu utilisateur"
                  aria-expanded={menuOpen}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.username}
                      className="w-8 h-8 rounded-full object-cover border-2 border-nout-turquoise hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-nout-roi text-white flex items-center justify-center text-xs font-bold font-title hover:opacity-90 transition-opacity">
                      {profile?.username?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-[#E8EFF5] py-2 z-50 animate-fade-in">

                    {/* En-tête profil */}
                    <div className="px-4 py-2 mb-1 border-b border-[#F0F4F8]">
                      <p className="text-xs font-semibold text-[#0A0F2C] truncate">
                        {profile?.username ?? 'Mon compte'}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                    </div>

                    {/* Liens navigation */}
                    {menuLinks.map(({ to, icon, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A2E] hover:bg-[#F8FAFF] hover:text-[#1A3A8F] transition-colors"
                      >
                        <span className="text-base w-5 text-center">{icon}</span>
                        {label}
                      </Link>
                    ))}

                    {/* Séparateur + Déconnexion */}
                    <div className="border-t border-[#F0F4F8] mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <span className="text-base w-5 text-center">🚪</span>
                        Déconnexion
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/connexion"
                className="px-4 py-2 border-2 border-nout-roi text-nout-roi rounded-full text-[13px] font-semibold hover:bg-nout-roi hover:text-white transition-all"
              >
                Connexion
              </Link>
              <Link
                to="/inscription"
                className="hidden sm:block px-4 py-2 text-white text-[13px] font-semibold rounded-full bg-nout-accent hover:opacity-90 transition-opacity"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
