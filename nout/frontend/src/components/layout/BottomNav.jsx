import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function BottomNav() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  const active = (path) =>
    pathname === path ? 'text-nout-primary' : 'text-gray-400'

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-nout-border z-50 flex justify-around items-center py-2">

      <Link to="/" className={`flex flex-col items-center gap-0.5 text-xs ${active('/')}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />
        </svg>
        Accueil
      </Link>

      <Link to="/recherche" className={`flex flex-col items-center gap-0.5 text-xs ${active('/recherche')}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        Rechercher
      </Link>

      <Link to="/publier" className="flex flex-col items-center gap-0.5">
        <div className="w-12 h-12 bg-nout-primary rounded-full flex items-center justify-center shadow-lg -mt-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="text-xs text-nout-primary font-semibold">Publier</span>
      </Link>

      <Link to="/messages" className={`flex flex-col items-center gap-0.5 text-xs ${active('/messages')}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
        </svg>
        Messages
      </Link>

      <Link
        to={user ? `/profil/${user.id}` : '/connexion'}
        className={`flex flex-col items-center gap-0.5 text-xs ${active(`/profil/${user?.id}`)}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Profil
      </Link>

    </nav>
  )
}
