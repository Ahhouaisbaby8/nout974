// ─── Configuration Membres Fondateurs ─────────────────────────────
// LAUNCH_DATE : seules les activités créées APRÈS cette date comptent.
// Mettre à null pour désactiver le filtre (mode test / avant ouverture).
export const LAUNCH_DATE   = null              // ex: '2026-09-01T00:00:00+04:00'
export const FOUNDER_TOTAL = 50
export const FOUNDER_TAKEN = 0                 // sera lu depuis la DB en production

// Critères d'attribution (dès LAUNCH_DATE, dans l'ordre chronologique) :
//   - Compte créé
//   - 5 annonces actives postées
//   - ET au moins 1 transaction complétée (achat OU vente)
// Attribution 1→50, jamais réattribué au-delà de 50.

// Résout le statut fondateur d'un profil venant de Supabase
export function resolveFounder(profile) {
  if (!profile) return { isFounder: false, founderNumber: null, showBadge: true }
  return {
    isFounder:     !!(profile.is_founder),
    founderNumber: profile.founder_number ?? null,
    showBadge:     profile.show_founder_badge !== false, // true par défaut
  }
}

// ─── Anneau doré + chip "FONDATEUR" autour d'un avatar ────────────
// size: 'lg' (w-24) | 'md' (w-[72px]) | 'sm' (w-10)
export function FounderRing({ size = 'md', children }) {
  const dims = size === 'lg' ? 'w-24 h-24'
             : size === 'md' ? 'w-[72px] h-[72px]'
             :                 'w-10 h-10'
  const chip = size === 'lg' ? 'text-[8px] px-2 py-0.5 -bottom-3'
             : size === 'md' ? 'text-[7px] px-1.5 py-0.5 -bottom-2.5'
             :                 'text-[7px] px-1.5 py-0.5 -bottom-2'
  return (
    <div className="relative flex-shrink-0">
      <div className={`${dims} rounded-full overflow-hidden`}
           style={{ boxShadow: '0 0 0 3px #D4A017, 0 0 14px 4px rgba(212,160,23,0.4)' }}>
        {children}
      </div>
      <span className={`absolute left-1/2 -translate-x-1/2 ${chip} whitespace-nowrap rounded-full font-bold tracking-wide`}
            style={{ background: '#0A0F2C', color: '#D4A017', border: '1px solid #D4A017' }}>
        FONDATEUR
      </span>
    </div>
  )
}

// ─── Mini badge Fondateur #N sur les ListingCards ─────────────────
export function FounderCardBadge({ number }) {
  return (
    <span className="absolute top-8 left-2 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight z-10"
          style={{ background: 'linear-gradient(135deg, #C8860A, #F5D45A)', color: '#3d1f00', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 21.2l1.4-6.8L2.2 9.7l6.9-.7z"/></svg>
      #{number}
    </span>
  )
}
