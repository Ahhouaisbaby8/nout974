import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../utils/categories'
import { ChevronDown } from 'lucide-react'

// Barre de catégories avec sous-catégories.
// Desktop : survol → panneau de sous-catégories. Mobile : clic → liste dépliée.
export default function CategoryMenu() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)   // catégorie ouverte
  const closeTimer = useRef(null)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const goCategory = (catId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}`) }
  const goSub      = (catId, subId) => { setOpenId(null); navigate(`/recherche?categorie=${catId}&sous=${subId}`) }

  // Desktop : survol avec petit délai de fermeture (évite les clignotements)
  const handleEnter = (id) => { clearTimeout(closeTimer.current); setOpenId(id) }
  const handleLeave = () => { closeTimer.current = setTimeout(() => setOpenId(null), 120) }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 relative">
      {CATEGORIES.map(cat => {
        const isOpen = openId === cat.id
        const hasSub = cat.sub?.length > 0
        return (
          <div
            key={cat.id}
            className="relative flex-shrink-0"
            onMouseEnter={() => hasSub && handleEnter(cat.id)}
            onMouseLeave={handleLeave}
          >
            <button
              onClick={() => {
                // Mobile (pas de survol) : 1er tap ouvre les sous-cat, sinon navigue.
                if (hasSub && openId !== cat.id) setOpenId(cat.id)
                else goCategory(cat.id)
              }}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-full border text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isOpen
                  ? 'bg-nout-turquoise text-white border-nout-turquoise'
                  : 'border-nout-border bg-white text-nout-texte hover:bg-nout-turquoise hover:text-white hover:border-nout-turquoise'
              }`}
            >
              {cat.label}
              {hasSub && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {/* Panneau sous-catégories */}
            {isOpen && hasSub && (
              <div className="absolute left-0 top-full mt-2 z-30 bg-white rounded-2xl shadow-lg border border-[#ECEFF4] p-2 min-w-[200px] animate-fade-in">
                <button
                  onClick={() => goCategory(cat.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold text-nout-turquoise hover:bg-[#F1F7FA]"
                >
                  Tout {cat.label.toLowerCase()}
                </button>
                <div className="border-t border-gray-100 my-1" />
                {cat.sub.map(s => (
                  <button
                    key={s.id}
                    onClick={() => goSub(cat.id, s.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-nout-texte hover:bg-[#F1F7FA] hover:text-nout-lagon transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
