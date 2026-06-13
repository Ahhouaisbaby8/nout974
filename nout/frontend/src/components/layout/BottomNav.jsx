import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function BottomNav() {
  const { user, unreadCount: unread } = useAuth()
  const { pathname } = useLocation()

  const active = (path) =>
    pathname === path ? 'text-nout-turquoise' : 'text-gray-400'

  return (
    <nav
      aria-label="Navigation principale"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-nout-border z-50 grid grid-cols-5"
    >
      <Link
        to="/"
        className={`flex flex-col items-center justify-center gap-0.5 text-xs min-h-[56px] py-2 ${active('/')}`}
      >
        <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />
        </svg>
        Accueil
      </Link>

      <Link
        to="/recherche"
        className={`flex flex-col items-center justify-center gap-0.5 text-xs min-h-[56px] py-2 ${active('/recherche')}`}
      >
        <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        Rechercher
      </Link>

      <Link
        to={user ? '/publier' : '/connexion'}
        className="flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2"
        aria-label="Publier une annonce"
      >
        <div className="w-12 h-12 bg-nout-turquoise rounded-full flex items-center justify-center shadow-lg -mt-5">
          <svg className="w-6 h-6 text-white" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="text-xs text-nout-turquoise font-semibold">Publier</span>
      </Link>

      <Link
        to="/messages"
        className={`relative flex flex-col items-center justify-center gap-0.5 text-xs min-h-[56px] py-2 ${active('/messages')}`}
        aria-label={unread > 0 ? `Messages — ${unread} non lus` : 'Messages'}
      >
        <div className="relative">
          <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
          </svg>
          {unread > 0 && (
            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        Messages
      </Link>

      <Link
        to={user ? `/profil/${user.id}` : '/connexion'}
        className={`flex flex-col items-center justify-center gap-0.5 text-xs min-h-[56px] py-2 ${active(`/profil/${user?.id}`)}`}
      >
        <svg className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Profil
      </Link>
    </nav>
  )
}
