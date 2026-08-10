import { Boxes } from 'lucide-react'

// Badge « Gro stock » (créole 974 = gros stock) — vendeur qui a un VRAI STOCK du MÊME article,
// pas seulement beaucoup d'annonces variées. Le badge n'apparaît que si un même article est en
// vente en 20 exemplaires ou plus (mêmes titres qui se répètent) → typiquement un revendeur/boutique.
// Icône sobre lucide (pas d'emoji), couleurs NOUT.
// size : 'sm' (annonces) | 'md' (profil)
export default function StockBadge({ size = 'sm', className = '' }) {
  const isMd = size === 'md'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-[#FBF1DF] text-[#B4690E] border border-[#F3D9A6] ${
        isMd ? 'text-[12px] px-3 py-1' : 'text-[10px] px-2 py-0.5'
      } ${className}`}
      title="Gro stock — ce vendeur a un gros stock du même article"
    >
      <Boxes className={isMd ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      Gro stock
    </span>
  )
}

// Seuil : nombre minimum d'exemplaires DU MÊME article pour afficher le badge.
export const GRO_STOCK_THRESHOLD = 20

// Normalise un titre pour regrouper les annonces d'un même article (casse, accents, espaces,
// ponctuation) → deux annonces « T-shirt blanc » et « T-Shirt  Blanc. » comptent comme le même article.
const normTitle = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/[^a-z0-9]+/g, ' ')                       // ponctuation → espace
    .trim()

// Décide si un vendeur mérite le badge « Gro stock » : il faut qu'au moins UN article revienne
// GRO_STOCK_THRESHOLD fois ou plus dans ses annonces actives. `listings` = tableau d'annonces {title}.
export function hasGroStock(listings) {
  if (!Array.isArray(listings) || listings.length < GRO_STOCK_THRESHOLD) return false
  const counts = new Map()
  for (const l of listings) {
    const key = normTitle(l?.title)
    if (!key) continue
    const n = (counts.get(key) ?? 0) + 1
    if (n >= GRO_STOCK_THRESHOLD) return true
    counts.set(key, n)
  }
  return false
}
