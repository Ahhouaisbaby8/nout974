import { Tag, Layers, Ruler, BadgeCheck, Palette, Shirt, MapPin } from 'lucide-react'
import { CATEGORIES, CONDITIONS } from '../../utils/categories'

// Tableau d'attributs façon Vinted : libellé (icône) à gauche, valeur en gras à droite,
// lignes séparées. N'affiche que les champs renseignés. Lisible et pro.
export default function ListingAttributes({ listing }) {
  const cat = CATEGORIES.find(c => c.id === listing.category)
  const sub = cat?.sub?.find(s => s.id === listing.subcategory)
  const condition = CONDITIONS.find(c => c.id === listing.condition)

  // Nettoie une valeur libre : ignore vide, "aucun", "n/a"… (saisies parasites des vendeurs)
  const clean = (v) => {
    const t = (v ?? '').toString().trim()
    if (!t) return null
    if (['aucun', 'aucune', 'n/a', 'na', '-', 'rien'].includes(t.toLowerCase())) return null
    return t
  }

  // Ordre Vinted-like. Chaque entrée : { icon, label, value }
  const rows = [
    cat        && { icon: Tag,        label: 'Catégorie',     value: cat.label },
    sub        && { icon: Layers,     label: 'Sous-catégorie', value: sub.label },
    clean(listing.brand)    && { icon: BadgeCheck, label: 'Marque',   value: clean(listing.brand) },
    clean(listing.size)     && { icon: Ruler,      label: 'Taille',   value: clean(listing.size) },
    condition  && { icon: BadgeCheck, label: 'État',          value: condition.label },
    clean(listing.color)    && { icon: Palette,    label: 'Couleur',  value: clean(listing.color) },
    clean(listing.material) && { icon: Shirt,      label: 'Matière',  value: clean(listing.material) },
    clean(listing.city)     && { icon: MapPin,     label: 'Localisation', value: clean(listing.city) },
  ].filter(Boolean)

  if (rows.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h2 className="font-title text-[13px] font-semibold uppercase tracking-wide text-nout-muted mb-1">
        Informations
      </h2>
      <dl className="divide-y divide-gray-100">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="flex items-center gap-2 text-sm text-gray-500">
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {label}
            </dt>
            <dd className="text-sm font-semibold text-nout-texte text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
