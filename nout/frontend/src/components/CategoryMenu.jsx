import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CATEGORIES } from '../utils/categories'
import { ChevronDown } from 'lucide-react'

// Parcourir par catégorie — GRILLE de tuiles (zéro scroll, plus de flèche).
// Ouverture des sous-catégories au SURVOL avec "hover-intent" : il faut RESTER ~160 ms
// sur une tuile pour l'ouvrir. Du coup, en descendant la souris vers le panneau on
// traverse les autres tuiles SANS les déclencher (fini le changement de catégorie accidentel).
// Clic = ouverture immédiate (et mobile).
export default function CategoryMenu() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)
  const openTimer  = useRef(null)
  const closeTimer = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(closeTimer.current) }, [])

  // Ferme le panneau au clic en dehors (utile mobile)
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const goCategory = (catId) => { setOpenId(null); navigate(`/c/${catId}`) }

  // Survol d'une tuile : on programme l'ouverture après un court délai (intent).
  const handleTileEnter = (id) => {
    clearTimeout(closeTimer.current)
    clearTimeout(openTimer.current)
    openTimer.current = setTimeout(() => setOpenId(id), 160)
  }
  // On quitte une tuile sans s'être arrêté → on annule l'ouverture en attente
  // (c'est ce qui permet de traverser les tuiles vers le panneau sans rien déclencher).
  const handleTileLeave = () => clearTimeout(openTimer.current)

  // On quitte toute la zone → fermeture douce
  const handleWrapLeave = () => {
    clearTimeout(openTimer.current)
    closeTimer.current = setTimeout(() => setOpenId(null), 220)
  }
  // Sur le panneau : on annule toute fermeture/ouverture en attente
  const cancelTimers = () => { clearTimeout(closeTimer.current); clearTimeout(openTimer.current) }

  const openCat = CATEGORIES.find(c => c.id === openId)

  return (
    <div ref={wrapRef} className="relative" onMouseLeave={handleWrapLeave}>

      {/* Grille de tuiles : passe à la ligne proprement, aucune barre scrollable ni flèche. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {CATEGORIES.map(cat => {
          const isOpen = openId === cat.id
          const hasSub = cat.sub?.length > 0
          return (
            <button
              key={cat.id}
              onMouseEnter={() => hasSub && handleTileEnter(cat.id)}
              onMouseLeave={handleTileLeave}
              onClick={() => { cancelTimers(); hasSub ? setOpenId(isOpen ? null : cat.id) : goCategory(cat.id) }}
              aria-expanded={hasSub ? isOpen : undefined}
              className={`flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl border text-[13px] font-medium text-left transition-all duration-150 cursor-pointer ${
                isOpen
                  ? 'bg-nout-turquoise text-white border-nout-turquoise'
                  : 'border-nout-border bg-white text-nout-texte hover:bg-nout-turquoise hover:text-white hover:border-nout-turquoise hover:shadow-nout-lg'
              }`}
            >
              <span className="truncate">{cat.label}</span>
              {hasSub && <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>
          )
        })}
      </div>

      {/* Panneau sous-catégories — superposé sous la grille, pleine largeur. */}
      {openCat?.sub?.length > 0 && (
        <div
          onMouseEnter={cancelTimers}
          className="absolute left-0 right-0 top-full mt-2 z-40 bg-white rounded-2xl shadow-xl border border-[#ECEFF4] p-4 animate-fade-in max-h-[60vh] overflow-y-auto"
        >
          <Link
            to={`/c/${openCat.id}`}
            onClick={() => setOpenId(null)}
            className="text-[13px] font-semibold text-nout-turquoise hover:underline mb-3 inline-block"
          >
            Tout voir en {openCat.label} →
          </Link>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
            {openCat.sub.map(s => (
              <Link
                key={s.id}
                to={`/c/${s.id}`}
                onClick={() => setOpenId(null)}
                className="text-left px-3 py-2 rounded-lg text-[13px] text-nout-texte hover:bg-[#F1F7FA] hover:text-nout-lagon transition-colors"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
