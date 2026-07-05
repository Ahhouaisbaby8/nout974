import { COLORS, COLOR_SWATCHES } from '../../utils/categories'

// Pastille de couleur — 'multicolore' = dégradé arc-en-ciel. Bordure douce pour rester visible
// même sur les couleurs très claires (Blanc, Crème…).
export function ColorDot({ name, size = 16 }) {
  const c = COLOR_SWATCHES[name] ?? '#CBD5E1'
  const style = c === 'multicolore'
    ? { background: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)' }
    : { background: c }
  return (
    <span
      className="rounded-full border border-black/10 flex-shrink-0 inline-block"
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    />
  )
}

// Sélecteur de couleurs — chips (pastille + nom), sélection multiple limitée à `max` (2 par défaut).
// Choix des chips plutôt qu'un menu déroulant : mobile-friendly, aucun besoin de dézoomer,
// et la pastille aide les personnes qui ont du mal avec les noms de couleurs.
export default function ColorPicker({ value = [], onChange, max = 2 }) {
  const toggle = (name) => {
    if (value.includes(name)) onChange(value.filter((c) => c !== name))
    else if (value.length < max) onChange([...value, name])
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((name) => {
          const active = value.includes(name)
          const disabled = !active && value.length >= max
          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              onClick={() => toggle(name)}
              aria-pressed={active}
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border text-sm transition-colors ${
                active
                  ? 'border-nout-primary bg-nout-primary/5 text-nout-dark font-medium'
                  : disabled
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <ColorDot name={name} />
              {name}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        {value.length}/{max} couleur{max > 1 ? 's' : ''} — la pastille aide à repérer la couleur.
      </p>
    </div>
  )
}
