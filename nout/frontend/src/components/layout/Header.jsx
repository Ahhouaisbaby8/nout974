import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Bell, User, ShoppingBag, Package, Settings as SettingsIcon, LogOut, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHeroOverlay } from '../../context/HeroContext'
import { getUnreadCount, subscribeToNotifications } from '../../services/notifications'
import { getAvatarUrl } from '../../utils/avatar'

export default function Header() {
  const { user, profile, logout, isAdmin, unreadCount: unread } = useAuth()
  const { overHero } = useHeroOverlay()
  const navigate  = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const menuRef = useRef(null)

  // Compteur de notifications non lues + temps réel
  useEffect(() => {
    if (!user?.id) { setNotifCount(0); return }
    getUnreadCount(user.id).then(setNotifCount).catch(() => {})
    const unsub = subscribeToNotifications(user.id, () => {
      getUnreadCount(user.id).then(setNotifCount).catch(() => {})
    })
    return unsub
  }, [user?.id])

  // Navbar transparente (texte blanc) sur le hero ; verre dépoli (texte sombre) sinon.
  // Le dropdown ouvert force l'état solide pour la lisibilité.
  const light = overHero && !menuOpen   // true = texte blanc sur fond transparent

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
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

  // Icônes toutes grises sobres (cohérence pro). Couleur d'accent appliquée au survol via le lien.
  const ICON = "w-[18px] h-[18px] text-gray-400"
  const menuGroups = [
    [
      { to: `/profil/${user?.id}`, icon: <User className={ICON} />, label: 'Mon profil' },
      { to: '/espace-vendeur',     icon: <Wallet className={ICON} />, label: 'Espace Vendeur' },
    ],
    [
      { to: '/favoris',              icon: <Heart className={ICON} />, label: 'Mes favoris' },
      { to: '/commandes?tab=achats', icon: <ShoppingBag className={ICON} />, label: 'Mes achats' },
      { to: '/commandes?tab=ventes', icon: <Package className={ICON} />, label: 'Mes ventes' },
    ],
    [
      { to: '/compte', icon: <SettingsIcon className={ICON} />, label: 'Mon compte' },
    ],
  ]

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        light
          ? 'bg-transparent'
          : 'bg-white/70 backdrop-blur-lg border-b border-white/40 shadow-nout-sm'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">

        {/* ── LOGO ── */}
        <Link
          to="/"
          aria-label="NOUT — accueil"
          className="flex-shrink-0 mr-2 flex flex-col leading-none"
          onClick={() => {
            if (document.scrollingElement) document.scrollingElement.scrollTop = 0
            window.scrollTo(0, 0)
          }}
        >
          <span className={`font-title font-black text-[20px] tracking-[0.18em] leading-none transition-colors ${light ? 'text-white' : 'text-[#0A0F2C]'}`}>
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

        {/* ── NAV DESKTOP ── (recherche retirée : la grande barre du hero suffit) */}
        <nav className={`hidden lg:flex items-center gap-5 text-[14px] ml-4 transition-colors ${light ? '[&_a]:text-white/90' : '[&_a]:text-nout-muted'}`}>
          <Link to="/"                  className="hover:text-nout-turquoise transition-colors font-medium">Accueil</Link>
          <Link to="/comment-ca-marche" className="hover:text-nout-turquoise transition-colors font-medium">Comment ça marche</Link>
          <Link to="/a-propos"          className="hover:text-nout-turquoise transition-colors font-medium">À propos</Link>
          <Link to="/aide"              className="hover:text-nout-turquoise transition-colors font-medium">Aide</Link>
          {isAdmin && (
            <Link to="/admin" className={`font-semibold hover:text-nout-lagon transition-colors ${light ? '!text-white' : 'text-nout-roi'}`}>
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

              {/* Icône favoris (cœur) */}
              <Link
                to="/favoris"
                title="Mes favoris"
                aria-label="Mes favoris"
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${light ? 'text-white hover:bg-white/15' : 'text-nout-muted hover:bg-gray-100 hover:text-nout-turquoise'}`}
              >
                <Heart className="w-5 h-5" />
              </Link>

              {/* Icône notifications (cloche) avec badge */}
              <Link
                to="/notifications"
                title="Notifications"
                aria-label="Notifications"
                className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-all ${light ? 'text-white hover:bg-white/15' : 'text-nout-muted hover:bg-gray-100 hover:text-nout-turquoise'}`}
              >
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </Link>

              {/* Icône messages avec badge */}
              <Link
                to="/messages"
                title="Messages"
                className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-all ${light ? 'text-white hover:bg-white/15' : 'text-nout-muted hover:bg-gray-100 hover:text-nout-turquoise'}`}
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
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-lg border border-[#E8EFF5] py-1.5 z-50 animate-fade-in">

                    {/* En-tête profil */}
                    <div className="px-4 py-3 mb-1 border-b border-[#F0F4F8]">
                      <p className="text-sm font-semibold text-[#0A0F2C] truncate">
                        {profile?.username ?? 'Mon compte'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>

                    {/* Liens navigation groupés */}
                    {menuGroups.map((group, gi) => (
                      <div key={gi} className={gi > 0 ? 'border-t border-[#F0F4F8] my-1 pt-1' : ''}>
                        {group.map(({ to, icon, label }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setMenuOpen(false)}
                            className="group flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A2E] hover:bg-[#F8FAFF] transition-colors"
                          >
                            <span className="flex-shrink-0 transition-colors group-hover:[&>svg]:text-[#00C4B4]">{icon}</span>
                            {label}
                          </Link>
                        ))}
                      </div>
                    ))}

                    {/* Séparateur + Déconnexion */}
                    <div className="border-t border-[#F0F4F8] my-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <span className="flex-shrink-0"><LogOut className="w-[18px] h-[18px]" /></span>
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
                className={`px-4 py-2 border-2 rounded-full text-[13px] font-semibold transition-all ${
                  light
                    ? 'border-white text-white hover:bg-white hover:text-nout-roi'
                    : 'border-nout-roi text-nout-roi hover:bg-nout-roi hover:text-white'
                }`}
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
