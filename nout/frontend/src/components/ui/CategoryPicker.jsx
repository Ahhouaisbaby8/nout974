// Sélecteur de catégorie en cascade (façon Vinted) — identité NOUT (sobre, sans icônes ni emoji).
// Remplace les chips à plat : rubrique → sous-rubrique en « drill-down », avec recherche.
//
// Props :
//   category    : id de la catégorie racine sélectionnée ('' si aucune)
//   subcategory : id de la sous-catégorie sélectionnée ('' si aucune)
//   onSelect    : ({ category, subcategory }) => void  — TOUJOURS appelé avec la paire cohérente
//   placeholder : texte du champ quand rien n'est choisi
//
// Le choix d'une sous-catégorie ferme le panneau. « Toute la catégorie » permet de ne poser
// que la rubrique (la sous-catégorie reste optionnelle, comme avant).

import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, ArrowLeft, Search, X } from 'lucide-react'
import { CATEGORIES } from '../../utils/categories'

export default function CategoryPicker({ category, subcategory, onSelect, placeholder = 'Sélectionne une catégorie' }) {
  const [open, setOpen]   = useState(false)
  const [level, setLevel] = useState(null)   // null = liste des rubriques ; sinon la rubrique ouverte
  const [query, setQuery] = useState('')

  const root = CATEGORIES.find(c => c.id === category)
  const sub  = root?.sub?.find(s => s.id === subcategory)

  // Libellé affiché dans le champ : « Vêtements homme › Chemises & polos »
  const display = root ? (sub ? `${root.label} › ${sub.label}` : root.label) : ''

  // Recherche : aplatie sur rubriques ET sous-rubriques ("robe" → Vêtements femme › Robes).
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const out = []
    for (const c of CATEGORIES) {
      if (c.label.toLowerCase().includes(q)) out.push({ cat: c, sub: null })
      for (const s of (c.sub ?? [])) {
        if (s.label.toLowerCase().includes(q)) out.push({ cat: c, sub: s })
      }
    }
    return out.slice(0, 30)
  }, [query])

  // Échap ferme ; on fige le scroll de la page tant que le panneau est ouvert.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    // Sauver puis RESTAURER la valeur précédente (au lieu de forcer ''), sinon un mauvais
    // ordre de démontage peut laisser body.overflow = 'hidden' → toute la page reste figée
    // (les champs du bas du formulaire deviennent inatteignables sur mobile). Cf. MobileMenu.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const close = () => { setOpen(false); setLevel(null); setQuery('') }

  const pick = (cat, subItem) => {
    onSelect({ category: cat.id, subcategory: subItem?.id ?? '' })
    close()
  }

  const rowClass = 'w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 hover:bg-[#F5F8FF] transition-colors'

  return (
    <>
      {/* Champ déclencheur (style input) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors
          ${display ? 'border-[#1A3A8F] bg-white text-nout-dark font-medium' : 'border-[#D6E0F5] bg-white text-gray-400 hover:border-[#00C4B4]'}`}
      >
        <span className="truncate">{display || placeholder}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={close}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85dvh] sm:max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barre du haut : recherche + fermer */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-100">
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {/* text-base (16px) = empêche le zoom auto d'iOS à la mise au point (fini le « obligé de
                    dézoomer »). Pas d'autoFocus : le clavier ne pop plus d'emblée → la liste reste visible. */}
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Trouver une catégorie"
                  className="flex-1 bg-transparent text-base outline-none text-nout-dark placeholder:text-gray-400"
                />
              </div>
              <button type="button" onClick={close} aria-label="Fermer" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fil d'ariane niveau 2 : retour + titre de la rubrique */}
            {!results && level && (
              <button
                type="button"
                onClick={() => setLevel(null)}
                className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-sm font-semibold text-nout-dark hover:bg-[#F5F8FF]"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-center pr-6">{level.label}</span>
              </button>
            )}

            {/* flex-1 + min-h-0 : occupe la hauteur restante du panneau et active vraiment le scroll
                interne. Sans ça, sur mobile le bas d'une longue liste (ex. Mixte) dépasse hors écran
                et le dernier item devient inatteignable. */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-gray-50">
              {/* Résultats de recherche (aplatis) */}
              {results && (
                results.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">Aucune catégorie trouvée.</p>
                ) : results.map(({ cat, sub: s }) => (
                  <button key={`${cat.id}-${s?.id ?? 'root'}`} type="button" onClick={() => pick(cat, s)} className={rowClass}>
                    <span className="text-sm text-nout-dark">
                      {s ? (<><span className="text-gray-400">{cat.label} › </span>{s.label}</>) : cat.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                ))
              )}

              {/* Niveau 1 : rubriques */}
              {!results && !level && CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => (c.sub?.length ? setLevel(c) : pick(c, null))}
                  className={rowClass}
                >
                  <span className={`text-sm ${c.id === category ? 'font-semibold text-[#1A3A8F]' : 'text-nout-dark'}`}>{c.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}

              {/* Niveau 2 : sous-rubriques de la rubrique ouverte */}
              {!results && level && (
                <>
                  <button type="button" onClick={() => pick(level, null)} className={rowClass}>
                    <span className="text-sm text-nout-dark">Toute la catégorie</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${category === level.id && !subcategory ? 'border-[#1A3A8F] bg-[#1A3A8F]' : 'border-gray-300'}`} />
                  </button>
                  {level.sub.map(s => (
                    <button key={s.id} type="button" onClick={() => pick(level, s)} className={rowClass}>
                      <span className={`text-sm ${s.id === subcategory ? 'font-semibold text-[#1A3A8F]' : 'text-nout-dark'}`}>{s.label}</span>
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${s.id === subcategory ? 'border-[#1A3A8F] bg-[#1A3A8F]' : 'border-gray-300'}`} />
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
