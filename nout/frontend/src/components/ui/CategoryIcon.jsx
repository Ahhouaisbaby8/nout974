import { Shirt, Baby, Footprints, Gem, ShoppingBag, Sparkles, Smartphone, PawPrint, Palette, Tag } from 'lucide-react'

const ICONS = {
  'vetements-femme':  Shirt,
  'vetements-homme':  Shirt,
  'vetements-enfant': Baby,
  'chaussures':       Footprints,
  'accessoires':      Gem,
  'sacs':             ShoppingBag,
  'beaute':           Sparkles,
  'electronique':     Smartphone,
  'animaux':          PawPrint,
  'createurs':        Palette,
}

export default function CategoryIcon({ id, size = 14, className = '' }) {
  const Icon = ICONS[id] ?? Tag
  return <Icon size={size} className={className} />
}
