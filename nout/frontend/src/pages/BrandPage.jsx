import Logo from '../components/Logo'

/* ── Palette à afficher ── */
const PALETTE = [
  { nom: 'Sol (primaire)',  hex: '#F4611C', token: '--sol',      clair: false },
  { nom: 'Sol foncé',       hex: '#D94F12', token: '--sol-dark', clair: false },
  { nom: 'Sol clair',       hex: '#FF8A50', token: '--sol-light',clair: false },
  { nom: 'Sol pâle',        hex: '#FFF0E8', token: '--sol-pale', clair: true  },
  { nom: 'Corail',          hex: '#FF8C42', token: '--corail',   clair: false },
  { nom: 'Miel',            hex: '#F6AD55', token: '--miel',     clair: false },
  { nom: 'Sable (fond)',    hex: '#FFF8F2', token: '--sable',    clair: true  },
  { nom: 'Vanille',         hex: '#FFF3E8', token: '--vanille',  clair: true  },
  { nom: 'Terre (texte)',   hex: '#2A1F1A', token: '--terre',    clair: false },
  { nom: 'Bois',            hex: '#5C3D2E', token: '--bois',     clair: false },
  { nom: 'Brume',           hex: '#9D7E6E', token: '--brume',    clair: false },
  { nom: 'Bordure',         hex: '#EDCFB8', token: '--bordure',  clair: true  },
  { nom: 'Succès',          hex: '#2D9B50', token: '--succes',   clair: false },
  { nom: 'Erreur',          hex: '#E53E3E', token: '--erreur',   clair: false },
  { nom: 'Lagon (info)',    hex: '#0099B8', token: '--info',     clair: false },
]

function Swatch({ nom, hex, clair }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-nout-border shadow-nout-sm">
      <div className="h-16" style={{ background: hex }} />
      <div className="p-2 bg-white">
        <p className="text-xs font-bold text-nout-dark">{nom}</p>
        <p className="text-xs text-nout-muted font-mono">{hex}</p>
      </div>
    </div>
  )
}

function Section({ titre, children }) {
  return (
    <section className="mb-12">
      <h2 className="font-title text-2xl font-bold text-nout-dark mb-6 pb-2 border-b-2 border-nout-border">
        {titre}
      </h2>
      {children}
    </section>
  )
}

export default function BrandPage() {
  return (
    <div className="min-h-screen bg-nout-secondary py-12 px-6">
      <div className="max-w-5xl mx-auto">

        {/* En-tête */}
        <div className="mb-12 p-8 rounded-2xl text-center" style={{ background: '#2C1A00' }}>
          <Logo variant="white" size="xl" className="mx-auto mb-4" />
          <p className="text-white/80 font-medium text-sm tracking-widest uppercase">
            Charte Graphique — Direction SOLÈY ☀️
          </p>
        </div>

        {/* 1. Logo */}
        <Section titre="1. Logo — 3 variantes">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div className="rounded-xl border border-nout-border bg-white p-6 flex flex-col items-center gap-3">
              <Logo variant="color" size="lg" />
              <p className="text-xs text-nout-muted font-mono">variant="color"</p>
              <p className="text-xs text-nout-mid">Fond clair / Header</p>
            </div>

            <div className="rounded-xl p-6 flex flex-col items-center gap-3" style={{ background: '#2C1A00' }}>
              <Logo variant="white" size="lg" />
              <p className="text-xs text-white/60 font-mono">variant="white"</p>
              <p className="text-xs text-white/80">Fond coloré / Footer</p>
            </div>

            <div className="rounded-xl border border-nout-border bg-nout-light p-6 flex flex-col items-center gap-3">
              <Logo variant="icon-only" size="lg" />
              <p className="text-xs text-nout-muted font-mono">variant="icon-only"</p>
              <p className="text-xs text-nout-mid">Favicon / App icon</p>
            </div>
          </div>

          {/* Tailles */}
          <div className="mt-6 p-6 bg-white rounded-xl border border-nout-border">
            <p className="text-xs text-nout-muted mb-4 font-semibold uppercase tracking-wider">Échelle des tailles</p>
            <div className="flex flex-wrap items-end gap-8">
              {['sm', 'md', 'lg', 'xl'].map(s => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <Logo variant="color" size={s} />
                  <span className="text-xs text-nout-muted font-mono">size="{s}"</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 2. Palette */}
        <Section titre="2. Palette Couleurs SOLÈY">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {PALETTE.map(c => <Swatch key={c.hex} {...c} />)}
          </div>
        </Section>

        {/* 3. Typographie */}
        <Section titre="3. Typographie">
          <div className="bg-white rounded-xl border border-nout-border p-8 space-y-6">

            <div>
              <p className="text-xs text-nout-muted mb-1 font-semibold uppercase tracking-wider">Nunito — Titres</p>
              <h1 className="font-title text-nout-dark" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 40 }}>
                NOUT 974 ☀️
              </h1>
              <h2 className="font-title text-nout-primary mt-2" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 28 }}>
                La marketplace 100 % réunionnaise
              </h2>
              <h3 className="font-title text-nout-mid mt-2" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 20 }}>
                Nout Dressing · Nout Maison · Nout Auto
              </h3>
            </div>

            <hr className="border-nout-border" />

            <div>
              <p className="text-xs text-nout-muted mb-1 font-semibold uppercase tracking-wider">Inter — Corps de texte</p>
              <p className="text-nout-dark text-base leading-relaxed">
                Achetez et vendez vos articles de seconde main partout à La Réunion.
                NOUT, c'est <em>le nôtre</em> en créole — une communauté, un partage, un ancrage 974.
              </p>
              <p className="text-nout-muted text-sm mt-2">
                Texte secondaire · Prix : <strong className="text-nout-primary font-title text-base">12 €</strong> · Publié il y a 2 jours
              </p>
            </div>
          </div>
        </Section>

        {/* 4. Boutons et badges */}
        <Section titre="4. Boutons &amp; Badges">
          <div className="bg-white rounded-xl border border-nout-border p-8 space-y-6">

            <div>
              <p className="text-xs text-nout-muted mb-3 font-semibold uppercase tracking-wider">Boutons Tailwind existants</p>
              <div className="flex flex-wrap gap-3 items-center">
                <button className="btn-primary">+ Publier une annonce</button>
                <button className="btn-secondary">Voir tout</button>
                <button className="btn-disabled" disabled>Indisponible</button>
              </div>
            </div>

            <div>
              <p className="text-xs text-nout-muted mb-3 font-semibold uppercase tracking-wider">Boutons Brand CSS (.nout-btn)</p>
              <div className="flex flex-wrap gap-3 items-center">
                <button className="nout-btn nout-btn-md nout-btn-primary">☀️ Publier</button>
                <button className="nout-btn nout-btn-md nout-btn-secondary">Voir tout</button>
                <button className="nout-btn nout-btn-md nout-btn-ghost">Annuler</button>
                <button className="nout-btn nout-btn-sm nout-btn-primary">Petit</button>
                <button className="nout-btn nout-btn-lg nout-btn-primary">Grand</button>
              </div>
            </div>

            <div>
              <p className="text-xs text-nout-muted mb-3 font-semibold uppercase tracking-wider">Badges (.nout-badge)</p>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="nout-badge nout-badge-primary">● Actif</span>
                <span className="nout-badge nout-badge-succes">✓ Vendu</span>
                <span className="nout-badge nout-badge-alerte">⏳ Réservé</span>
                <span className="nout-badge nout-badge-erreur">✕ Refusé</span>
                <span className="nout-badge nout-badge-info">ℹ En attente</span>
                <span className="nout-badge nout-badge-neutre">Occasion</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-nout-muted mb-3 font-semibold uppercase tracking-wider">Tags catégories (.nout-tag)</p>
              <div className="flex flex-wrap gap-2">
                {['👗 Vêtements', '👟 Chaussures', '📱 Électronique', '🏠 Maison', '🚗 Auto', '🌿 Jardin'].map(t => (
                  <button key={t} className="nout-tag">{t}</button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 5. Carte annonce exemple */}
        <Section titre="5. Carte Annonce — Aperçu">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { titre: 'Robe fleurie taille 38', prix: 12, ville: 'Saint-Denis', date: 'Il y a 2 j', img: null, badge: null },
              { titre: 'iPhone 13 Pro — excellent état', prix: 650, ville: 'Saint-Pierre', date: 'Il y a 5 h', img: null, badge: 'Réservé' },
              { titre: 'Table basse bambou', prix: 45, ville: 'Saint-Paul', date: 'Il y a 1 j', img: null, badge: null },
              { titre: 'Vélo VTT 26 pouces', prix: 120, ville: 'Le Tampon', date: 'Il y a 3 h', img: null, badge: 'Vendu' },
            ].map((item, i) => (
              <div key={i} className="nout-card group">
                <div className="aspect-square bg-gradient-to-br from-nout-pale-pri to-nout-light flex items-center justify-center text-4xl">
                  {['👗', '📱', '🪑', '🚲'][i]}
                </div>
                <div className="p-3">
                  {item.badge && (
                    <span className={`nout-badge mb-2 inline-block ${item.badge === 'Vendu' ? 'nout-badge-succes' : 'nout-badge-alerte'}`}>
                      {item.badge}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-nout-dark line-clamp-2 leading-snug mb-1">
                    {item.titre}
                  </p>
                  <p className="nout-prix text-base">{item.prix} €</p>
                  <p className="text-xs text-nout-muted mt-1">{item.ville} · {item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer brand */}
        <div className="mt-8 p-6 rounded-2xl text-center" style={{ background: '#2A1F1A' }}>
          <Logo variant="white" size="md" className="mx-auto mb-3" />
          <p className="text-white/40 text-xs tracking-widest uppercase">Identité visuelle — Direction SOLÈY ☀️ — 2026</p>
        </div>

      </div>
    </div>
  )
}
