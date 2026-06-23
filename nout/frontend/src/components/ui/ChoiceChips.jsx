// Sélecteur en boutons cliquables (chips) — identité NOUT (nuit / turquoise, sans emoji).
// Remplace les menus déroulants pour un choix plus rapide et plus visuel.
//
// Props :
//   options : [{ value, label }]  (ou tableau de strings)
//   value   : valeur sélectionnée
//   onChange: (value) => void
//   columns : nb de colonnes (optionnel, sinon flex-wrap)

export default function ChoiceChips({ options, value, onChange, columns }) {
  const items = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))

  return (
    <div
      className={columns ? `grid gap-2` : 'flex flex-wrap gap-2'}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {items.map(({ value: v, label }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(active ? '' : v)}
            aria-pressed={active}
            className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all text-center
              ${active
                ? 'border-[#1A3A8F] bg-[#1A3A8F] text-white shadow-sm'
                : 'border-[#D6E0F5] bg-white text-nout-dark hover:border-[#00C4B4]'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
