import logoLagon      from '../assets/logo-lagon.svg'
import logoNuit       from '../assets/logo-nuit.svg'
import logoTurquoise  from '../assets/logo-turquoise.svg'
import logoOcean      from '../assets/logo-ocean.svg'

const DIRS = [
  {
    id: 'lagon',
    nom: 'Lagon',
    tag: '🌊',
    logo: logoLagon,
    palette: {
      primary:    '#0077B6',
      accent:     '#00B4D8',
      accentDark: '#005F89',
      pale:       '#E0F4FF',
      bg:         '#F8FCFF',
      card:       '#FFFFFF',
      border:     '#BEE3F8',
      text:       '#0A1F2E',
      textMid:    '#2C6E8A',
      textMuted:  '#5B9BB5',
      dark:       '#0A1F2E',
      glow:       'rgba(0,119,182,0.25)',
    },
  },
  {
    id: 'nuit',
    nom: 'Nuit Tropicale',
    tag: '🌌',
    logo: logoNuit,
    palette: {
      primary:    '#2EC4B6',
      accent:     '#0A1628',
      accentDark: '#1A3A5C',
      pale:       '#E0FAF8',
      bg:         '#F5FFFE',
      card:       '#FFFFFF',
      border:     '#B2EDE8',
      text:       '#0A1628',
      textMid:    '#1A4A5A',
      textMuted:  '#4A8A8A',
      dark:       '#0A1628',
      glow:       'rgba(46,196,182,0.25)',
    },
  },
  {
    id: 'turquoise',
    nom: 'Turquoise',
    tag: '🌿',
    logo: logoTurquoise,
    palette: {
      primary:    '#006D77',
      accent:     '#83C5BE',
      accentDark: '#004E57',
      pale:       '#E8F8F7',
      bg:         '#F0FDFC',
      card:       '#FFFFFF',
      border:     '#A8DEDA',
      text:       '#012E35',
      textMid:    '#005A63',
      textMuted:  '#5B9E98',
      dark:       '#012E35',
      glow:       'rgba(0,109,119,0.22)',
    },
  },
  {
    id: 'ocean',
    nom: 'Océan Dégradé',
    tag: '🎇',
    logo: logoOcean,
    palette: {
      primary:    '#0096C7',
      accent:     '#023E8A',
      accentDark: '#012F6B',
      pale:       '#E0F3FF',
      bg:         '#EFF9FF',
      card:       '#FFFFFF',
      border:     '#B8DFF5',
      text:       '#021B33',
      textMid:    '#0A4A7A',
      textMuted:  '#4A85AA',
      dark:       '#021B33',
      glow:       'rgba(0,150,199,0.28)',
    },
  },
]

function MiniSite({ dir }) {
  const p = dir.palette

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: p.bg, borderRadius: 20, overflow: 'hidden', border: `2px solid ${p.border}`, boxShadow: `0 8px 40px ${p.glow}` }}>

      {/* ── HEADER ── */}
      <div style={{ background: '#fff', borderBottom: `1.5px solid ${p.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={dir.logo} alt="NOUT" style={{ height: 34, width: 'auto' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: p.textMid, fontWeight: 500 }}>Accueil</span>
          <span style={{ fontSize: 13, color: p.textMid, fontWeight: 500 }}>Recherche</span>
          <button style={{ padding: '8px 18px', border: `2px solid ${p.primary}`, borderRadius: 9999, fontSize: 13, fontWeight: 700, color: p.primary, background: 'transparent', cursor: 'pointer' }}>
            Connexion
          </button>
          <button style={{ padding: '8px 18px', background: p.primary, borderRadius: 9999, fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer' }}>
            + Publier
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{ padding: '40px 32px 36px', textAlign: 'center', background: `linear-gradient(135deg, ${p.pale} 0%, ${p.bg} 100%)` }}>
        <span style={{ display: 'inline-block', padding: '4px 14px', background: p.pale, border: `1.5px solid ${p.border}`, borderRadius: 9999, fontSize: 11, fontWeight: 700, color: p.primary, letterSpacing: '1px', marginBottom: 16 }}>
          LA MARKETPLACE 974
        </span>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 38, fontWeight: 800, color: p.text, lineHeight: 1.15, marginBottom: 12 }}>
          Achète et vends<br />
          <span style={{ color: p.primary }}>partout à La Réunion</span>
        </h1>
        <p style={{ fontSize: 15, color: p.textMuted, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
          NOUT, c'est <em>le nôtre</em> en créole — une communauté 100 % réunionnaise.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={{ padding: '13px 32px', background: p.primary, color: '#fff', borderRadius: 9999, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: `0 4px 20px ${p.glow}` }}>
            Voir les annonces
          </button>
          <button style={{ padding: '13px 32px', background: '#fff', color: p.primary, border: `2px solid ${p.primary}`, borderRadius: 9999, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Vendre maintenant
          </button>
        </div>
      </div>

      {/* ── CARTES ANNONCES ── */}
      <div style={{ padding: '24px 24px 28px' }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: p.text, marginBottom: 16 }}>
          Annonces récentes
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { titre: 'Robe fleurie T38',    prix: '12 €',  ville: 'Saint-Denis', emoji: '👗', badge: null },
            { titre: 'iPhone 13 Pro',        prix: '650 €', ville: 'Saint-Pierre', emoji: '📱', badge: 'Réservé' },
            { titre: 'Table basse rotin',    prix: '45 €',  ville: 'Saint-Paul',   emoji: '🪑', badge: null },
          ].map((item, i) => (
            <div key={i} style={{ background: p.card, borderRadius: 14, border: `1.5px solid ${p.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: p.pale }}>
                {item.emoji}
              </div>
              <div style={{ padding: '10px 12px' }}>
                {item.badge && (
                  <span style={{ display: 'inline-block', padding: '2px 8px', background: p.pale, color: p.primary, borderRadius: 9999, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                    {item.badge}
                  </span>
                )}
                <p style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 2, lineHeight: 1.3 }}>{item.titre}</p>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: p.text }}>{item.prix}</p>
                <p style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>{item.ville}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER MINI ── */}
      <div style={{ background: p.dark, padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={dir.logo} alt="NOUT" style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)' }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px' }}>NOUT 974 © 2026</span>
      </div>
    </div>
  )
}

export default function BrandCompare() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F0F0', padding: '40px 24px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>
            Choisir une direction
          </h1>
          <p style={{ fontSize: 15, color: '#6B7280' }}>
            Aperçu complet — header, hero, annonces, footer — dans chaque palette
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          {DIRS.map(dir => (
            <div key={dir.id}>
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{dir.tag}</span>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: '#0A1628', margin: 0 }}>
                  {dir.nom}
                </h2>
              </div>
              <MiniSite dir={dir} />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
