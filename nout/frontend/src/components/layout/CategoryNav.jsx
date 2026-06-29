import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../utils/categories'

// Barre catégories desktop (2e rangée du header) + mega-menu façon Vinted/KazaKaz.
// Ouverture au SURVOL avec hover-intent (120 ms) pour ne pas déclencher en traversant,
// au FOCUS clavier, et fermeture douce + touche Échap. Chaque racine est aussi un lien
// cliquable vers /c/:id (pages déjà crawlables). `light` = par-dessus le hero (texte blanc).
export default function CategoryNav({ light }) {
  const [openId, setOpenId] = useState(null)
  const openTimer  = useRef(null)
  const closeTimer = useRef(null)

  const clearTimers  = () => { clearTimeout(openTimer.current); clearTimeout(closeTimer.current) }
  const scheduleOpen = (id) => { clearTimers(); openTimer.current = setTimeout(() => setOpenId(id), 120) }
  const cancelOpen   = () => clearTimeout(openTimer.current)
  const scheduleClose = () => { clearTimeout(openTimer.current); closeTimer.current = setTimeout(() => setOpenId(null), 180) }

  useEffect(() => () => clearTimers(), [])

  // Échap ferme le panneau.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpenId(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const openCat = CATEGORIES.find(c => c.id === openId)

  return (
    <div className="hidden lg:block relative border-t border-white/10" onMouseLeave={scheduleClose}>
      <nav
        aria-label="Catégories"
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-center gap-1 text-[13.5px] font-medium transition-colors ${
          light ? 'text-white/90' : 'text-nout-muted'
        }`}
      >
        {CATEGORIES.map(cat => {
          const isOpen = openId === cat.id
          return (
            <Link
              key={cat.id}
              to={`/c/${cat.id}`}
              onMouseEnter={() => scheduleOpen(cat.id)}
              onMouseLeave={cancelOpen}
              onFocus={() => setOpenId(cat.id)}
              onClick={() => setOpenId(null)}
              aria-haspopup="true"
              aria-expanded={isOpen}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                isOpen
                  ? (light ? 'text-white bg-white/10' : 'text-[#0E8C82] bg-[#F1F7FA]')
                  : 'hover:text-[#0E8C82]'
              }`}
            >
              {cat.navLabel ?? cat.label}
            </Link>
          )
        })}
      </nav>

      {/* Mega-panneau — pleine largeur sous la barre, fond solide. */}
      {openCat?.sub?.length > 0 && (
        <div
          onMouseEnter={clearTimers}
          onMouseLeave={scheduleClose}
          className="absolute left-0 right-0 top-full bg-gradient-to-b from-white to-[#F4F7FB] border-t border-[#ECEFF4] shadow-[0_28px_52px_-16px_rgba(10,15,44,0.40)] z-50 animate-fade-in"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
            <Link
              to={`/c/${openCat.id}`}
              onClick={() => setOpenId(null)}
              className="inline-flex items-center text-[13px] font-semibold text-[#0E8C82] hover:underline mb-3"
            >
              Tout voir en {openCat.label}
            </Link>
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-0.5">
              {openCat.sub.map(s => (
                <Link
                  key={s.id}
                  to={`/c/${s.id}`}
                  onClick={() => setOpenId(null)}
                  className="px-2 py-1.5 rounded-md text-[13px] text-nout-texte hover:bg-[#F1F7FA] hover:text-nout-lagon transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
