import Logo from '../components/Logo'

const PALETTE = [
  { nom: 'Hibiscus (signature)', hex: '#D94F5C' },
  { nom: 'Hibiscus foncé',       hex: '#B83847' },
  { nom: 'Hibiscus clair',       hex: '#F07080' },
  { nom: 'Hibiscus pâle',        hex: '#FFF0F2' },
  { nom: 'Corail',               hex: '#FF8370' },
  { nom: 'Lagon',                hex: '#0096C7' },
  { nom: 'Fond principal',       hex: '#FDFBFB' },
  { nom: 'Fond alternatif',      hex: '#FDF4F5' },
  { nom: 'Encre (texte)',        hex: '#1A0A0C' },
  { nom: 'Bois',                 hex: '#5C2830' },
  { nom: 'Brume',                hex: '#9D666D' },
  { nom: 'Bordure',              hex: '#F0D0D3' },
  { nom: 'Succès',               hex: '#15803D' },
  { nom: 'Erreur',               hex: '#B91C1C' },
  { nom: 'Info',                 hex: '#0369A1' },
]

function Swatch({ nom, hex }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-nout-border shadow-nout-sm">
      <div className="h-14" style={{ background: hex }} />
      <div className="p-2 bg-white">
        <p className="text-xs font-bold text-nout-dark leading-tight">{nom}</p>
        <p className="text-xs text-nout-muted font-mono mt-0.5">{hex}</p>
      </div>
    </div>
  )
}

function Section({ titre, children }) {
  return (
    <section className="mb-12">
      <h2 className="font-title text-2xl font-bold text-nout-dark mb-6 pb-3 border-b-2 border-nout-border">
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
        <div className="mb-12 p-10 rounded-2xl text-center" style={{ background: '#1A0A0C' }}>
          <Logo variant="white" size="xl" className="mx-auto mb-5" />
          <p className="text-white/40 text-xs tracking-widest uppercase mt-2">
            Charte Graphique — Direction Hibiscus 🌺 — 2026
          </p>
        </div>

        {/* 1. Logo */}
        <Section titre="1. Logo — 3 variantes">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div className="rounded-2xl border border-nout-border bg-white p-8 flex flex-col items-start gap-4">
              <Logo variant="color" size="lg" />
              <div>
                <p className="text-xs text-nout-muted font-mono">variant="color"</p>
                <p className="text-xs text-nout-mid mt-0.5">Header · Fond clair</p>
              </div>
            </div>

            <div className="rounded-2xl p-8 flex flex-col items-start gap-4" style={{ background: '#1A0A0C' }}>
              <Logo variant="white" size="lg" />
              <div>
                <p className="text-xs text-white/40 font-mono">variant="white"</p>
                <p className="text-xs text-white/60 mt-0.5">Footer · Fond sombre</p>
              </div>
            </div>

            <div className="rounded-2xl border border-nout-border bg-nout-light p-8 flex flex-col items-center justify-center gap-4">
              <Logo variant="icon-only" size="lg" />
              <div className="text-center">
                <p className="text-xs text-nout-muted font-mono">variant="icon-only"</p>
                <p className="text-xs text-nout-mid mt-0.5">Favicon · App icon</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-6 bg-white rounded-2xl border border-nout-border">
            <p className="text-xs text-nout-muted mb-5 font-semibold uppercase tracking-wider">Échelle des tailles</p>
            <div className="flex flex-wrap items-end gap-10">
              {['sm', 'md', 'lg', 'xl'].map(s => (
                <div key={s} className="flex flex-col gap-2">
                  <Logo variant="color" size={s} />
                  <span className="text-xs text-nout-muted font-mono">size="{s}"</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 2. Palette */}
        <Section titre="2. Palette Couleurs — Hibiscus 🌺">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {PALETTE.map(c => <Swatch key={c.hex} {...c} />)}
          </div>
        </Section>

        {/* 3. Typographie */}
        <Section titre="3. Typographie">
          <div className="bg-white rounded-2xl border border-nout-border p-8 space-y-8">

            <div>
              <p className="text-xs text-nout-muted mb-3 font-semibold uppercase tracking-wider">Plus Jakarta Sans — Titres</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 48, lineHeight: 1.1, color: '#1A0A0C' }}>
                NOUT
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 28, color: '#D94F5C', marginTop: 4 }}>
                La marketplace 100 % réunionnaise
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 16, color: '#5C2830', marginTop: 8 }}>
                Nout Dressing · Nout Maison · Nout Auto · Nout Tech
              </p>
            </div>

            <hr className="border-nout-border" />

            <div>
              <p className="text-xs text-nout-muted mb-3 font-semibold uppercase tracking-wider">DM Sans — Corps de texte</p>
              <p className="text-nout-dark text-base leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Achetez et vendez vos articles de seconde main partout à La Réunion.
                NOUT, c'est <em>le nôtre</em> en créole — une communauté, un partage, un ancrage 974.
              </p>
              <p className="text-nout-muted text-sm mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Texte secondaire · Prix : <strong className="text-nout-dark font-title text-lg">12 €</strong> · Publié il y a 2 jours à Saint-Denis
              </p>
            </div>
          </div>
        </Section>

        {/* 4. Boutons & Badges */}
        <Section titre="4. Boutons & Badges">
          <div className="bg-white rounded-2xl border border-nout-border p-8 space-y-8">

            <div>
              <p className="text-xs text-nout-muted mb-4 font-semibold uppercase tracking-wider">Boutons principaux</p>
              <div className="flex flex-wrap gap-3 items-center">
                <button className="btn-primary">+ Publier une annonce</button>
                <button className="btn-secondary">Voir tout</button>
                <button className="btn-disabled" disabled>Indisponible</button>
              </div>
            </div>

            <div>
              <p className="text-xs text-nout-muted mb-4 font-semibold uppercase tracking-wider">Boutons brand CSS (.nout-btn)</p>
              <div className="flex flex-wrap gap-3 items-center">
                <button className="nout-btn nout-btn-lg nout-btn-primary">🌺 Publier</button>
                <button className="nout-btn nout-btn-md nout-btn-primary">Contacter</button>
                <button className="nout-btn nout-btn-md nout-btn-secondary">Voir tout</button>
                <button className="nout-btn nout-btn-md nout-btn-ghost">Annuler</button>
                <button className="nout-btn nout-btn-sm nout-btn-primary">Petit</button>
              </div>
            </div>

            <div>
              <p className="text-xs text-nout-muted mb-4 font-semibold uppercase tracking-wider">Badges</p>
              <div className="flex flex-wrap gap-2">
                <span className="nout-badge nout-badge-primary">● Actif</span>
                <span className="nout-badge nout-badge-succes">✓ Vendu</span>
                <span className="nout-badge nout-badge-alerte">⏳ Réservé</span>
                <span className="nout-badge nout-badge-erreur">✕ Refusé</span>
                <span className="nout-badge nout-badge-info">ℹ En attente</span>
                <span className="nout-badge nout-badge-neutre">Bon état</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-nout-muted mb-4 font-semibold uppercase tracking-wider">Tags catégories</p>
              <div className="flex flex-wrap gap-2">
                {['👗 Vêtements', '👟 Chaussures', '📱 Électronique', '🏠 Maison', '🚗 Auto', '🌿 Jardin'].map(t => (
                  <button key={t} className="nout-tag">{t}</button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 5. Cartes annonces */}
        <Section titre="5. Carte Annonce — Aperçu">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { titre: 'Robe fleurie taille 38', prix: 12, ville: 'Saint-Denis', date: 'Il y a 2 j', emoji: '👗', badge: null },
              { titre: 'iPhone 13 Pro — excellent état', prix: 650, ville: 'Saint-Pierre', date: 'Il y a 5 h', emoji: '📱', badge: 'Réservé' },
              { titre: 'Table basse rotin naturel', prix: 45, ville: 'Saint-Paul', date: 'Il y a 1 j', emoji: '🪑', badge: null },
              { titre: 'Vélo VTT 26 pouces', prix: 120, ville: 'Le Tampon', date: 'Il y a 3 h', emoji: '🚲', badge: 'Vendu' },
            ].map((item, i) => (
              <div key={i} className="nout-card group cursor-pointer">
                <div className="aspect-square flex items-center justify-center text-5xl" style={{ background: '#FFF0F2' }}>
                  {item.emoji}
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
                  <p className="font-title font-bold text-base text-nout-dark">{item.prix} €</p>
                  <p className="text-xs text-nout-muted mt-1">{item.ville} · {item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer brand */}
        <div className="p-8 rounded-2xl text-center" style={{ background: '#1A0A0C' }}>
          <Logo variant="white" size="md" className="mx-auto mb-3" />
          <p className="text-white/30 text-xs tracking-widest uppercase mt-2">
            Identité visuelle — Direction Hibiscus 🌺 — 2026
          </p>
        </div>

      </div>
    </div>
  )
}
