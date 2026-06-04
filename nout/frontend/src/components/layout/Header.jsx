import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAvatarUrl } from '../../utils/avatar'

export default function Header() {
  const { user, profile, logout, isAdmin, unreadCount: unread } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const avatarUrl = getAvatarUrl(profile?.avatar_url)

  return (
    <header className="bg-nout-secondary border-b border-nout-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-nout-primary tracking-tight">
          NOUT
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex gap-6 text-sm">
          <Link to="/"         className="text-nout-dark hover:text-nout-primary transition-colors">Accueil</Link>
          <Link to="/a-propos" className="text-nout-dark hover:text-nout-primary transition-colors">À propos</Link>
          <Link to="/aide"     className="text-nout-dark hover:text-nout-primary transition-colors">Aide</Link>
          {isAdmin && (
            <Link to="/admin" className="text-nout-primary font-semibold hover:underline">Admin</Link>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/publier"
                className="hidden sm:block px-4 py-2 bg-nout-primary text-white rounded-nout text-sm font-bold hover:bg-[#E55A25] transition-all"
              >
                + Publier
              </Link>

              {/* Icône messages avec badge */}
              <Link to="/messages" className="relative text-nout-dark hover:text-nout-primary transition-colors" title="Messages">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>

              <Link to={`/profil/${user.id}`} className="flex items-center gap-2">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile?.username} className="w-8 h-8 rounded-full object-cover border-2 border-nout-primary" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-nout-primary text-white flex items-center justify-center text-sm font-bold">
                    {profile?.username?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
                  </div>
                )}
              </Link>

              <button onClick={handleLogout} className="text-sm text-[#666] hover:text-nout-error transition-colors">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion"   className="px-5 py-2 border-2 border-nout-primary text-nout-primary rounded-nout text-sm font-bold hover:bg-nout-primary hover:text-white transition-all">
                Connexion
              </Link>
              <Link to="/inscription" className="px-5 py-2 bg-nout-primary text-white rounded-nout text-sm font-bold hover:bg-[#E55A25] transition-all">
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
