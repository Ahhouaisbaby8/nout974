import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../utils/categories'
import { ChevronDown } from 'lucide-react'
import CategoryIcon from './ui/CategoryIcon'

// Parcourir par catégorie — GRILLE de tuiles qui passe à la ligne (zéro scroll horizontal,
// plus de flèche : toutes les catégories sont visibles d'un coup). Clic sur une tuile :
// ouvre ses sous-catégories en dessous (ou va à la catégorie si elle n'en a pas).
export default function CategoryMenu() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)
  const wrapRef = useRef(null)

  // Ferme le panneau au clic en dehors
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const goCategory = (catId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}`) }
  const goSub      = (catId, subId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}&sous=${subId}`) }

  const openCat = CATEGORIES.find(c => c.id === openId)

  return (
    <div ref={wrapRef} className="relative">

      {/* Grille de tuiles : passe à la ligne proprement, aucune barre scrollable ni flèche. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {CATEGORIES.map(cat => {
          const isOpen = openId === cat.id
          const hasSub = cat.sub?.length > 0
          return (
            <button
              key={cat.id}
              onClick={() => (hasSub ? setOpenId(isOpen ? null : cat.id) : goCategory(cat.id))}
              aria-expanded={hasSub ? isOpen : undefined}
              className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border text-[13px] font-medium text-left transition-all duration-150 cursor-pointer ${
                isOpen
                  ? 'bg-nout-turquoise text-white border-nout-turquoise'
                  : 'border-nout-border bg-white text-nout-texte hover:bg-nout-turquoise hover:text-white hover:border-nout-turquoise hover:shadow-nout-lg'
              }`}
            >
              <CategoryIcon id={cat.id} size={18} className="flex-shrink-0" />
              <span className="flex-1 truncate">{cat.label}</span>
              {hasSub && <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>
          )
        })}
      </div>

      {/* Panneau sous-catégories — superposé sous la grille, pleine largeur. */}
      {openCat?.sub?.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-white rounded-2xl shadow-xl border border-[#ECEFF4] p-4 animate-fade-in max-h-[60vh] overflow-y-auto">
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
