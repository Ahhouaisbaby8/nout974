import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronDown, Plus } from 'lucide-react'
import { CATEGORIES } from '../../utils/categories'
import CategoryIcon from '../ui/CategoryIcon'

// Liens utilitaires (étaient en hidden lg:flex dans le header = inaccessibles sur mobile).
const NAV_LINKS = [
  { to: '/',                  label: 'Accueil' },
  { to: '/comment-ca-marche', label: 'Comment ça marche' },
  { to: '/a-propos',          label: 'À propos' },
  { to: '/aide',              label: 'Aide' },
]

// Drawer mobile (lg:hidden) : glisse depuis la gauche. Liens de nav + accordéon catégories.
// Ferme sur clic d'un lien, sur le fond, et sur Échap. Verrouille le scroll du body.
export default function MobileMenu({ open, onClose, isAdmin, isLoggedIn }) {
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="lg:hidden fixed inset-0 z-[60]">
      {/* Fond */}
      <button
        aria-label="Fermer le menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-fade-in"
      />

      {/* Panneau */}
      <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-left">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#F0F4F8] flex-shrink-0">
          <span className="font-title font-black text-[18px] tracking-[0.18em] text-[#0A0F2C]">NOUT</span>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 flex items-center justify-center rounded-full text-nout-muted hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          {/* Liens de nav */}
          <nav className="px-2">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={onClose}
                className="block px-4 py-3 rounded-xl text-[15px] font-medium text-nout-texte hover:bg-[#F1F7FA] transition-colors"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="block px-4 py-3 rounded-xl text-[15px] font-semibold text-nout-roi hover:bg-[#F1F7FA] transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Catégories — accordéon */}
          <p className="px-6 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Catégories
          </p>
          <div className="px-2 pb-4">
            {CATEGORIES.map(cat => {
              const isExpanded = expandedId === cat.id
              return (
                <div key={cat.id} className="border-b border-[#F4F7FA] last:border-0">
                  <div className="flex items-center">
                    <Link
                      to={`/c/${cat.id}`}
                      onClick={onClose}
                      className="flex-1 flex items-center gap-2.5 px-4 py-3 text-[15px] font-medium text-nout-texte"
                    >
                      <CategoryIcon id={cat.id} size={18} className="text-nout-muted flex-shrink-0" />
                      {cat.navLabel ?? cat.label}
                    </Link>
                    {cat.sub?.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                        aria-label={isExpanded ? `Replier ${cat.label}` : `Déplier ${cat.label}`}
                        aria-expanded={isExpanded}
                        className="w-11 h-11 flex items-center justify-center text-nout-muted flex-shrink-0"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {isExpanded && cat.sub?.length > 0 && (
                    <div className="pb-2 pl-11 pr-2">
                      {cat.sub.map(s => (
                        <Link
                          key={s.id}
                          to={`/c/${s.id}`}
                          onClick={onClose}
                          className="block px-3 py-2 rounded-lg text-[13.5px] text-nout-muted hover:bg-[#F1F7FA] hover:text-nout-lagon transition-colors"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Raccourci Vendre pour les connectés (le bouton du header est masqué sur très petit écran). */}
          {isLoggedIn && (
            <div className="px-4 pb-6 pt-1">
              <Link
                to="/publier"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-full bg-nout-accent text-white text-[15px] font-semibold"
              >
                <Plus className="w-4 h-4" /> Vendre un article
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
