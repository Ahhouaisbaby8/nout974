import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../utils/categories'
import { ChevronDown } from 'lucide-react'

// Barre de catégories avec sous-catégories.
// Desktop : survol → panneau de sous-catégories (superposé, ne pousse pas le contenu).
// Mobile : clic → panneau dépliable.
export default function CategoryMenu() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)
  const closeTimer = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // Ferme le panneau si clic en dehors (utile mobile)
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const goCategory = (catId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}`) }
  const goSub      = (catId, subId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}&sous=${subId}`) }

  const handleEnter = (id) => { clearTimeout(closeTimer.current); setOpenId(id) }
  const handleLeave = () => { closeTimer.current = setTimeout(() => setOpenId(null), 150) }

  const openCat = CATEGORIES.find(c => c.id === openId)

  return (
    // Conteneur SANS overflow : le panneau peut déborder sans être coupé.
    <div ref={wrapRef} className="relative" onMouseLeave={handleLeave}>

      {/* Barre de boutons : mobile = défilement horizontal au doigt ; desktop = passage
          à la ligne (wrap) pour que TOUTES les catégories soient visibles et atteignables
          (la scrollbar est masquée, donc sans wrap les dernières seraient inatteignables à la souris). */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:flex-wrap md:overflow-x-visible">
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
