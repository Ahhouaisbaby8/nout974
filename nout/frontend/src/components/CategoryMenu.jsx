import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../utils/categories'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

// Barre de catégories avec sous-catégories — UNE SEULE LIGNE (façon Vinted).
// Mobile : défilement horizontal au doigt. Desktop : flèches ‹ › qui apparaissent
//          quand il y a trop de catégories (sinon les dernières seraient inatteignables
//          à la souris, la scrollbar étant masquée).
// Survol desktop / clic mobile → panneau de sous-catégories superposé (ne pousse pas le contenu).
export default function CategoryMenu() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)
  const closeTimer = useRef(null)
  const wrapRef = useRef(null)
  const scrollRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // Ferme le panneau si clic en dehors (utile mobile)
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Affiche/masque les flèches selon la position de défilement (desktop)
  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  const scrollByDir = (dir) =>
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' })

  const goCategory = (catId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}`) }
  const goSub      = (catId, subId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}&sous=${subId}`) }

  const handleEnter = (id) => { clearTimeout(closeTimer.current); setOpenId(id) }
  const handleLeave = () => { closeTimer.current = setTimeout(() => setOpenId(null), 150) }

  const openCat = CATEGORIES.find(c => c.id === openId)

  const arrowCls =
    'hidden md:flex absolute top-[18px] -translate-y-1/2 z-30 w-9 h-9 items-center justify-center ' +
    'rounded-full bg-white border border-nout-border shadow-md text-nout-texte ' +
    'hover:bg-nout-turquoise hover:text-white hover:border-nout-turquoise transition-colors'

  return (
    // Conteneur SANS overflow : le panneau peut déborder sans être coupé.
    <div ref={wrapRef} className="relative" onMouseLeave={handleLeave}>

      {/* Flèche gauche (desktop, si on peut défiler à gauche) */}
      {canLeft && (
        <button
          type="button"
          aria-label="Voir les catégories précédentes"
          onClick={() => scrollByDir(-1)}
          className={`${arrowCls} -left-3`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Flèche droite (desktop, si on peut défiler à droite) */}
      {canRight && (
        <button
          type="button"
          aria-label="Voir les catégories suivantes"
          onClick={() => scrollByDir(1)}
          className={`${arrowCls} -right-3`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Barre de boutons : une seule ligne, défilement horizontal (doigt sur mobile,
          flèches sur desktop). scrollbar masquée pour rester propre façon Vinted. */}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {CATEGORIES.map(cat => {
          const isOpen = openId === cat.id
          const hasSub = cat.sub?.length > 0
          return (
            <button
              key={cat.id}
              onMouseEnter={() => hasSub && handleEnter(cat.id)}
              onClick={() => {
                if (hasSub && openId !== cat.id) setOpenId(cat.id)
                else goCategory(cat.id)
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-2 rounded-full border text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isOpen
                  ? 'bg-nout-turquoise text-white border-nout-turquoise'
                  : 'border-nout-border bg-white text-nout-texte hover:bg-nout-turquoise hover:text-white hover:border-nout-turquoise'
              }`}
            >
              {cat.label}
              {hasSub && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>
          )
        })}
      </div>

      {/* Panneau sous-catégories — superposé (absolute), ne pousse pas le contenu.
          Apparaît sous la barre, pleine largeur, en grille. Scrollable si long. */}
      {openCat?.sub?.length > 0 && (
        <div
          onMouseEnter={() => clearTimeout(closeTimer.current)}
          className="absolute left-0 right-0 top-full z-40 bg-white rounded-2xl shadow-xl border border-[#ECEFF4] p-4 animate-fade-in max-h-[60vh] overflow-y-auto"
        >
          <button
            onClick={() => goCategory(openCat.id)}
            className="text-[13px] font-semibold text-nout-turquoise hover:underline mb-3 inline-block"
          >
            Tout voir en {openCat.label} →
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
            {openCat.sub.map(s => (
              <button
                key={s.id}
                onClick={() => goSub(openCat.id, s.id)}
                className="text-left px-3 py-2 rounded-lg text-[13px] text-nout-texte hover:bg-[#F1F7FA] hover:text-nout-lagon transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
