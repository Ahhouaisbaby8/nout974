import { Shirt, Baby, Footprints, Gem, ShoppingBag, Sparkles } from 'lucide-react'

const ICONS = {
  'vetements-femme':  Shirt,
  'vetements-homme':  Shirt,
  'vetements-enfant': Baby,
  'chaussures':       Footprints,
  'accessoires':      Gem,
  'sacs':             ShoppingBag,
  'beaute':           Sparkles,
}

export default function CategoryIcon({ id, size = 14, className = '' }) {
  const Icon = ICONS[id]
  return Icon ? <Icon size={size} className={className} /> : null
}
