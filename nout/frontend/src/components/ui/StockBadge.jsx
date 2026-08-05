import { Boxes } from 'lucide-react'

// Badge « Gro stock » (créole 974 = beaucoup de stock) — vendeur qui a beaucoup d'articles en vente.
// Apparaît automatiquement dès qu'un vendeur a 10 annonces actives ou plus. Rassure l'acheteur :
// « ce vendeur a du choix / du stock ». Icône sobre lucide (pas d'emoji), couleurs NOUT.
// size : 'sm' (annonces) | 'md' (profil)
export default function StockBadge({ size = 'sm', className = '' }) {
  const isMd = size === 'md'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-[#FBF1DF] text-[#B4690E] border border-[#F3D9A6] ${
        isMd ? 'text-[12px] px-3 py-1' : 'text-[10px] px-2 py-0.5'
      } ${className}`}
      title="Gro stock — ce vendeur a beaucoup d'articles en vente"
    >
      <Boxes className={isMd ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      Gro stock
    </span>
  )
}

// Seuil : nombre minimum d'annonces actives pour afficher le badge.
export const GRO_STOCK_THRESHOLD = 10
