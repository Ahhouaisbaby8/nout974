import { Palette } from 'lucide-react'

// Badge « Créateur péi » — artisan qui fabrique lui-même à La Réunion.
// Icône sobre (lucide), pas d'emoji : ça fait pro. Couleurs NOUT (turquoise/lagon).
// size : 'sm' (annonces) | 'md' (profil)
export default function CreatorBadge({ size = 'sm', className = '' }) {
  const isMd = size === 'md'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-[#EAF6F5] text-[#0E7FAB] border border-[#B9E5E1] ${
        isMd ? 'text-[12px] px-3 py-1' : 'text-[10px] px-2 py-0.5'
      } ${className}`}
      title="Créateur péi — fabrique ses articles à La Réunion"
    >
      <Palette className={isMd ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      Créateur péi
    </span>
  )
}
