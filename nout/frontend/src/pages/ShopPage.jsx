import { useMemo, useState } from 'react'
import { computeProtectionFee, computeBuyerTotal } from '../utils/shipping'
import { formatPrice } from '../utils/formatters'
import { FONTS, stockImg, heroImg } from './pro/proData'
import { ProductView, CheckoutView, LegalView } from './pro/ShopViews'

// ─── NOUT Pro : BOUTIQUE à la marque du vendeur (storefront riche) ──────────────────
// Présentationnel : reçoit `shop` (marque, accent_color, font_key, template_key, mode,
// rayons, links) et `listings`. Structure issue de l'étude des 20 meilleurs sites
// Shopify FR : barre d'annonce, USP, hero par LAYOUT (7 mises en page), best-sellers,
// avis, « L'atelier », « Comment ça marche », bandeau confiance, footer légal.
// Modes : 'escrow' (défaut, tunnel NOUT) · 'contact' (services : devis via messagerie,
// AUCUN paiement de prestation — même logique que sale_mode='contact' véhicules) ·
// 'bio' (page de liens du créateur).
// Argent : les prix passent par utils/shipping (prix TOTAL protection incluse affiché
// en principal — conformité affichage des prix, audit 10/08). AUCUN code paiement ici.

// mise en page d'accueil livrée par chaque thème (l'éditeur « Personnaliser » peut la changer)
export const LAYS = {
  epuree: 'minimal', vitrine: 'hero', marche: 'market', douce: 'soft', moderne: 'modern',
  grille: 'grid', lumina: 'hero', pure: 'minimal', studio: 'grid', active: 'modern',
  marmaille: 'soft', ecrin: 'soft', conseil: 'minimal', terrain: 'hero', bio: 'bio', classic: 'minimal',
  galerie: 'hero', metier: 'market', spot: 'bio', botanique: 'soft',
}
const DARKS = new Set(['moderne', 'lumina', 'active', 'bio'])
// fonds de page proposés dans « Personnaliser » (clé → couleur)
export const TONES = { blanc: '#FFFFFF', creme: '#FBF6EE', sable: '#F7F3EE', gris: '#F4F5F6', sombre: '#10151C' }

// ─── Palette d'une boutique : arrière-plan, premier plan, surfaces ─────────────────
// Le vendeur choisit son FOND et, s'il le veut, la couleur de son TEXTE et de ses
// CARTES. Tout le reste (nuances atténuées, bordures) se calcule à partir du premier
// plan : c'est ce qui garantit qu'une page reste lisible quelle que soit la combinaison.

// Luminance relative (WCAG) — sert à savoir si un fond est sombre et à mesurer le contraste
const LUM = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return 1
  const [r, g, b] = m.slice(1).map((v) => {
    const c = parseInt(v, 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const isDarkColor = (hex) => LUM(hex) < 0.4
// Rapport de contraste entre deux couleurs (1 = identique, 21 = noir sur blanc)
export const contrastRatio = (a, b) => {
  const la = LUM(a), lb = LUM(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function buildPalette(shop) {
  const themeLay = LAYS[shop.template_key] || 'minimal'
  const tone = shop.bg_tone || (DARKS.has(shop.template_key) ? 'sombre' : themeLay === 'market' ? 'creme' : 'blanc')
  const paper = shop.bg_color || TONES[tone] || '#FFFFFF'
  const dark = isDarkColor(paper)
  const fg = shop.text_color || (dark ? '#FFFFFF' : '#16302E')
  // les cartes se détachent du fond : blanc sur clair, voile lumineux sur sombre
  const surface = shop.surface_color || (dark ? 'rgba(255,255,255,.05)' : '#FFFFFF')
  // nuances : le même premier plan, plus ou moins effacé — jamais un gris arbitraire
  const mut = (pct) => `color-mix(in srgb, ${fg} ${pct}%, transparent)`
  return { tone, paper, dark, fg, surface, mut, line: mut(12), themeLay }
}

function Stars({ i }) {
  const rating = (4.5 + ((i * 7) % 5) / 10).toFixed(1).replace('.', ',')
  const count = 6 + (i * 13) % 38
  return <p className="text-[10.5px] text-amber-600/90 mt-0.5 font-medium">★ {rating} ({count})</p>
}

function SfCard({ l, i, pal, contact, accent, badge, sector, seed = 0, onOpen }) {
  // `badge` : couleur secondaire choisie par le vendeur. Non renseignée → pastille blanche
  // (le rendu d'origine des 21 templates, qu'on ne change pas sans qu'il le demande).
  const badgeStyle = badge ? { background: badge, color: '#fff' } : undefined
  const badgeCls = badge ? '' : 'bg-white text-nout-texte'
  const img = l.images?.[0]
  // 2e visuel au survol : la vraie 2e photo du produit si elle existe, sinon une image
  // d'ambiance de l'univers (pattern des meilleures boutiques : 8/19 des sites étudiés).
  const img2 = l.images?.[1] || stockImg(sector, i + 1, seed)
  const nPhotos = l.images?.length || 0
  return (
    <button type="button" onClick={onOpen}
            style={{ background: pal.surface }}
            className="group text-left rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
        {img && <img src={img} alt={l.title} loading="lazy"
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        {img2 && img2 !== img && (
          <img src={img2} alt="" loading="lazy"
               className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}
        {i === 0 && <span className={`absolute top-2 left-2 text-[8.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm ${badgeCls}`} style={badgeStyle}>Plus vendu</span>}
        {i === 3 && <span className={`absolute top-2 left-2 text-[8.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm ${badgeCls}`} style={badgeStyle}>Nouveau</span>}
        {nPhotos > 1 && (
          <span className="absolute bottom-2 right-2 flex gap-1 opacity-80" aria-label={`${nPhotos} photos`}>
            {l.images.slice(0, 5).map((_, k) => (
              <span key={k} className={`w-1.5 h-1.5 rounded-full ${k === 0 ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </span>
        )}
      </div>
      <div className="pt-2 px-0.5 pb-1">
        <p className="text-[12.5px] font-medium truncate" style={{ color: pal.mut(92) }}>{l.title}</p>
        {/* « Sur devis » aussi quand le prix est absent : sans cette garde, computeBuyerTotal(null)
            afficherait 0,25 € (la part fixe de la protection) sur un produit sans prix. */}
        {contact || !(Number(l.price) > 0) ? (
          <p className="text-[13px] font-bold mt-0.5" style={{ color: accent }}>Sur devis</p>
        ) : (
          <>
            <Stars i={i} />
            <p className="text-[15px] font-bold mt-0.5 tabular-nums" style={{ color: pal.fg }}>
              {formatPrice(computeBuyerTotal(l.price, 'hand'))}
            </p>
            <p className="text-[10px]" style={{ color: pal.mut(48) }}>
              dont {formatPrice(computeProtectionFee(l.price))} de protection acheteur
            </p>
          </>
        )}
      </div>
    </button>
  )
}

// `wide` : rendu « ordinateur » (grille plus dense, marges plus larges). On le passe
// explicitement plutôt que d'utiliser des breakpoints CSS, parce que cette page est
// rendue dans des conteneurs de largeurs très différentes (vignette réduite, aperçu
// live étroit, aperçu plein écran) — les media queries regardent la fenêtre, pas le cadre.
// `browsable` : autorise la navigation interne (fiche produit → commande, pages
// légales). Désactivé dans les vignettes de la galerie, où la boutique est une image.
export default function ShopPage({ shop, listings = [], isOwner = false, wide = false, browsable = false }) {
  const accent = shop.accent_color || '#0E8C82'
  // couleur secondaire : badges, chiffres des étapes, bandeau de confiance. Par défaut =
  // la principale, pour qu'une boutique qui n'y touche pas reste cohérente.
  const accent2 = shop.accent2 || accent
  // `hero_lay` : mise en page d'accueil choisie dans « Personnaliser » (où va l'image) ;
  // sinon celle du thème. La page « Lien en bio » garde sa structure propre.
  const themeLay = LAYS[shop.template_key] || 'minimal'
  const lay = themeLay === 'bio' ? 'bio' : (shop.hero_lay || themeLay)
  // Palette : fond, premier plan, surfaces. `dark` se DÉDUIT de la luminosité réelle du
  // fond — un vert profond choisi à la main bascule les textes en clair tout seul.
  const pal = buildPalette(shop)
  const { paper, dark, fg, surface, mut } = pal
  const contact = shop.mode === 'contact'
  const titleFam = (FONTS[shop.font_key] || FONTS.montserrat).fam
  const rayons = ['Tout', ...(shop.rayons || [])]
  const [rayon, setRayon] = useState('Tout')
  const [toast, setToast] = useState('')
  const [view, setView] = useState(null)   // { kind:'product'|'checkout'|'legal', … }
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2400) }
  const openProduct = (l, i) => { if (browsable) { setView({ kind: 'product', l, i }); return true } return false }

  const shown = rayon === 'Tout' ? listings : listings.filter((l) => l.rayon === rayon)
  const best = useMemo(() => listings.slice(0, wide ? 4 : 3), [listings, wide])
  const seed = shop.imgSeed || 0
  // visuel d'accueil : celui téléversé par le vendeur, sinon celui choisi dans la galerie
  const hImg = shop.heroImage || heroImg(shop.sector || 'Autre', shop.heroIdx ?? seed)

  const bgStyle = { background: paper, color: fg }
  // Écrans internes : on parcourt la boutique comme un vrai site (produit, commande, légal)
  const viewProps = { shop, accent, dark, titleFam, contact, wide, onSay: say, onBack: () => setView(null) }

  // ── Sections de contenu : ORDRE et textes définis par le vendeur (« Personnaliser ») ──
  // shop.layout = [{ id, on, pos }] ; pos = 'before' (avant les rayons) ou 'after' (après la grille)
  const T = shop.texts || {}
  const descr = T.description || shop.description
  const cta = T.cta || (contact ? 'Demander un devis' : 'Découvrir')
  const line = ''                       // les filets viennent de la palette (styleLine)
  const styleLine = { borderColor: pal.line }
  const secTitle = { fontFamily: titleFam }
  // En grand écran, les fonds restent pleine largeur mais le CONTENU est centré et borné
  // (comportement de tous les vrais sites : une ligne de texte de 1600 px est illisible).
  const inner = wide ? 'max-w-[1280px] mx-auto w-full' : ''
  const SECTION_NODES = {
    bs: (!contact && best.length > 0) && (
      <div key="bs" className={`${wide ? 'px-8 pt-9' : 'px-5 pt-5'} ${inner}`}>
        <h2 className={`font-bold mb-3 ${wide ? 'text-[19px]' : 'text-[15px]'}`} style={secTitle}>{T.bsTitle || 'Nos best-sellers'}</h2>
        <div className={`grid gap-3 ${wide ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {best.map((l, i) => <SfCard key={l.id} l={l} i={i} pal={pal} contact={contact} accent={accent} badge={shop.accent2}
                                      sector={shop.sector} seed={seed}
                                      onOpen={() => { if (!openProduct(l, i)) say('Démo — fiche produit et achat protégé NOUT') }} />)}
        </div>
      </div>
    ),
    reviews: (
      <div key="reviews" style={styleLine} className={`px-5 py-5 border-t  ${inner} ${wide ? 'px-8 py-8' : ''}`}>
        <h2 className="text-[15px] font-bold" style={secTitle}>{T.reviewsTitle || `Ils ont ${contact ? 'fait appel à nous' : 'commandé'}`}</h2>
        <p className="text-[12px] font-bold text-amber-600/90 mt-1 mb-3">★ 4,9 / 5 — avis d'exemple (démo). Les vrais avis NOUT apparaîtront ici.</p>
        <blockquote className="text-[12.5px] leading-relaxed" style={{ color: mut(72) }}>
          « {contact ? 'Devis clair, travail propre, je recommande.' : 'Reçu en 2 jours au point relais, qualité au top.'} »
          <span className="block text-[11px] mt-0.5" style={{ color: mut(48) }}>— Mélissa · Saint-Denis</span>
        </blockquote>
      </div>
    ),
    about: (
      <div key="about" style={styleLine} className={`flex items-center gap-4 px-5 py-5 border-t  ${inner} ${wide ? 'px-8 py-8 gap-8' : ''}`}>
        <div className={`rounded-xl overflow-hidden flex-shrink-0 ${wide ? 'w-44 h-44' : 'w-24 h-24'}`}>
          <img src={shop.aboutImage || stockImg(shop.sector || 'Autre', 1, seed)} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold" style={secTitle}>{T.aboutTitle || (contact ? "L'équipe" : "L'atelier")}</h2>
          <p className="text-[12px] leading-relaxed mt-1" style={{ color: mut(62) }}>
            {T.aboutText || `Une ${contact ? 'entreprise' : 'boutique'} indépendante de La Réunion. Chaque ${contact ? 'projet est suivi' : 'commande est préparée'} avec soin.`}
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: mut(45) }}>{shop.city || 'La Réunion (974)'} · Vendeur vérifié NOUT</p>
        </div>
      </div>
    ),
    how: (
      <div key="how" style={styleLine} className={`px-5 py-5 border-t  ${inner} ${wide ? 'px-8 py-8' : ''}`}>
        <h2 className="text-[15px] font-bold mb-3" style={secTitle}>{T.howTitle || 'Comment ça marche'}</h2>
        <div className="grid grid-cols-3 gap-3 text-[11px] leading-relaxed opacity-80">
          {(contact
            ? [['1. Je décris', 'Mon besoin en 2 minutes'], ['2. Je reçois un devis', 'Réponse sous 24 h'], ['3. On planifie', 'Échanges via la messagerie NOUT']]
            : [['1. Je commande', 'Paiement sécurisé en ligne'], ['2. Mon argent est protégé', "Conservé en sécurité jusqu'à réception"], ['3. Je reçois', 'Point relais 974, domicile ou main propre']]
          ).map(([t, s]) => (
            <div key={t}><b className="block mb-0.5" style={{ color: accent2 }}>{t}</b>{s}</div>
          ))}
        </div>
      </div>
    ),
  }
  const DEFAULT_LAYOUT = [
    { id: 'bs', on: true, pos: 'before' },
    { id: 'reviews', on: true, pos: 'after' },
    { id: 'about', on: true, pos: 'after' },
    { id: 'how', on: true, pos: 'after' },
  ]
  const blocks = (shop.layout || DEFAULT_LAYOUT)
    .filter((b) => b.on && SECTION_NODES[b.id])
    .map((b) => ({ pos: b.pos, node: SECTION_NODES[b.id] }))

  // ── Écrans internes (quand on navigue dans la boutique) ──
  if (view) {
    const shell = (child) => <div className="min-h-[70vh]" style={bgStyle}>{child}{toast && <Toast msg={toast} />}</div>
    if (view.kind === 'product') return shell(
      <ProductView {...viewProps} listing={view.l} index={view.i}
                   onBuy={() => setView({ kind: 'checkout', l: view.l, i: view.i })} />)
    if (view.kind === 'checkout') return shell(
      <CheckoutView {...viewProps} listing={view.l} index={view.i}
                    onBack={() => setView({ kind: 'product', l: view.l, i: view.i })} />)
    if (view.kind === 'legal') return shell(
      <LegalView {...viewProps} page={view.page} onOpen={(p) => setView({ kind: 'legal', page: p })} />)
  }

  // ── Page « Lien en bio » : structure dédiée, pas de catalogue ──
  if (lay === 'bio') {
    // deux ambiances possibles : sombre (Bio) ou claire (Spot)
    return (
      <div className="min-h-[70vh]" style={bgStyle}>
        <title>{`${shop.name} — Liens`}</title>
        <div className="max-w-md mx-auto px-5 py-12 text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden ring-2" style={{ '--tw-ring-color': mut(20) }}>
            <img src={hImg} alt="" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold" style={secTitle}>{shop.name}</h1>
          <p className="text-[13px] mt-1" style={{ color: mut(62) }}>{shop.tagline}</p>
          <p className="text-[12px] mt-2 leading-relaxed" style={{ color: mut(48) }}>{descr}</p>
          <div className="flex flex-col gap-3 mt-7">
            {(shop.links || []).map((lk) => (
              <button key={lk.title} type="button"
                      onClick={() => say(lk.kind === 'shop' ? 'Démo — renvoie vers sa boutique NOUT' : 'Démo — lien externe du créateur')}
                      className="w-full py-3.5 rounded-2xl text-[14px] font-semibold border transition-opacity hover:opacity-90"
                      style={lk.kind === 'shop'
                        ? { background: accent, borderColor: accent, color: '#fff' }
                        : { borderColor: mut(18), background: pal.surface, color: fg }}>
                {lk.title}
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-8" style={{ color: mut(40) }}>
            Propulsé par <span className="font-bold" style={{ color: accent }}>NOUT</span> · Paiement protégé sur la boutique
          </p>
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    )
  }

  // `onDark` : le bloc d'accueil peut être sombre alors que le reste de la page est clair
  // (bandeau sombre) — sans ce paramètre le texte gris se retrouve illisible sur fond noir.
  const heroTxt = (center = false, onDark = dark) => (
    <div className={center ? 'text-center flex flex-col items-center' : ''}>
      <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: onDark ? '#fff' : accent }}>Boutique</p>
      <h1 className={`leading-tight font-bold mt-2 max-w-[24ch] ${wide ? 'text-[40px]' : 'text-[24px]'} ${onDark ? 'text-white' : ''}`} style={secTitle}>{shop.tagline}</h1>
      <p className={`leading-relaxed mt-3 max-w-[46ch] ${wide ? 'text-[15px]' : 'text-[13px]'}`} style={{ color: onDark ? 'rgba(255,255,255,.72)' : mut(62) }}>{descr}</p>
      <button type="button" onClick={() => say(contact ? 'Démo — ouvre la messagerie NOUT (devis)' : 'Voir les produits ci-dessous')}
              className={`mt-4 rounded-full font-bold text-white w-fit ${wide ? 'px-7 py-3 text-[14px]' : 'px-5 py-2.5 text-[13px]'}`}
              style={{ background: accent }}>
        {cta}
      </button>
      <p className="text-[11px] mt-3" style={{ color: onDark ? 'rgba(255,255,255,.5)' : mut(48) }}>★ 4,9 · {contact ? '38 avis clients' : '47 ventes'} · Vendeur vérifié NOUT</p>
    </div>
  )

  return (
    <div className="min-h-[70vh]" style={bgStyle}>
      <title>{`${shop.name} — Boutique NOUT 974`}</title>
      <meta name="description" content={shop.tagline || `La boutique ${shop.name} sur NOUT.`} />

      {/* barre d'annonce (promesse escrow — pattern 14/19 des meilleurs sites) */}
      <div className="text-center text-[9.5px] font-bold uppercase tracking-wider py-1.5 px-3 text-white"
           style={{ background: accent2 }}>
        {T.announce || (contact
          ? 'Devis gratuit sous 24 h · Échanges sécurisés via NOUT'
          : "Votre argent est protégé jusqu'à réception · Livraison en point relais dès 4 €")}
      </div>

      {/* header : wordmark typographié (pas de pastille-lettre) */}
      <div style={styleLine} className={`flex items-center justify-between px-5 py-3.5 border-b  ${inner} ${wide ? 'px-8 py-5' : ''}`}>
        <span className="text-[16px] font-bold truncate" style={secTitle}>{shop.name}</span>
        <div className="hidden sm:flex gap-4 text-[12px]" style={{ color: mut(55) }}>
          <span>Boutique</span><span>Nouveautés</span><span>À propos</span>
        </div>
        <button type="button" onClick={() => say('Démo — panier et paiement sécurisé NOUT')}
                className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: mut(22) }}
                aria-label="Panier">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12h11l1.6-8H6"/></svg>
        </button>
      </div>

      {/* USP */}
      <div style={styleLine} className={`flex justify-center gap-4 flex-wrap py-2 px-4 text-[9.5px] font-bold uppercase tracking-wide opacity-55 border-b  ${wide ? 'py-3 text-[10.5px] gap-8' : ''}`}>
        <span>Livraison 974</span><span>{contact ? 'Devis sous 24 h' : 'Retours 14 jours'}</span><span>Paiement sécurisé</span>
      </div>

      {/* HERO par layout */}
      {lay === 'hero' ? (
        <div className={`relative flex flex-col justify-end text-white ${wide ? 'min-h-[380px] p-10' : 'min-h-[230px] p-5'}`}
             style={{ background: `linear-gradient(180deg, rgba(8,12,24,.12), rgba(8,12,24,.68)), url(${hImg}) center/cover` }}>
          <div className={inner}>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/90">Boutique</p>
            <h1 className={`leading-tight font-bold mt-1 max-w-[24ch] ${wide ? 'text-[40px]' : 'text-[24px]'}`} style={secTitle}>{shop.tagline}</h1>
            <p className={`text-white/85 mt-2 max-w-[46ch] ${wide ? 'text-[15px]' : 'text-[13px]'}`}>{descr}</p>
            <button type="button" onClick={() => say(contact ? 'Démo — ouvre la messagerie NOUT (devis)' : 'Voir les produits ci-dessous')}
                    className={`mt-3 rounded-full font-bold w-fit text-white ${wide ? 'px-7 py-3 text-[14px]' : 'px-5 py-2.5 text-[13px]'}`}
                    style={{ background: accent }}>
              {cta}
      </button>
          </div>
        </div>
      ) : lay === 'minimal' || lay === 'splitL' ? (
        // en étroit, on empile (texte puis image) : côte à côte, la colonne de texte
        // tombe à ~190 px et le titre se casse en bouillie sur téléphone
        <div className={`flex items-stretch ${wide ? 'max-w-[1600px] mx-auto' : 'flex-col sm:flex-row'} ${lay === 'splitL' ? 'sm:flex-row-reverse' : ''}`}>
          <div className={`flex-1 min-w-0 flex flex-col justify-center ${wide
            ? (lay === 'splitL' ? 'py-16 pr-[max(2rem,calc((100vw-1280px)/2))] pl-12' : 'py-16 pl-[max(2rem,calc((100vw-1280px)/2))] pr-12')
            : 'p-6'}`}>{heroTxt()}</div>
          <div className={`flex-1 ${wide ? 'min-h-[440px]' : 'h-[210px] sm:h-auto sm:min-h-[230px]'}`}>
            <img src={hImg} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      ) : lay === 'band' ? (
        // bandeau photo pleine largeur, texte en dessous
        <div>
          <div className={`w-full overflow-hidden ${wide ? 'h-[300px]' : 'h-[150px]'}`}>
            <img src={hImg} alt="" className="w-full h-full object-cover" />
          </div>
          <div className={`${inner} ${wide ? 'py-10 px-8' : 'p-6'}`}>{heroTxt()}</div>
        </div>
      ) : lay === 'market' ? (
        <div className={wide ? 'py-14 px-8' : 'p-6'}>
          <div className={`flex items-center gap-4 ${inner} ${wide ? 'gap-12' : 'flex-col-reverse sm:flex-row'}`}>
            <div className="flex-1 min-w-0">{heroTxt()}</div>
            <div className={`rounded-full overflow-hidden border-4 border-white shadow-md flex-shrink-0 ${wide ? 'w-56 h-56' : 'w-28 h-28'}`}>
              <img src={hImg} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      ) : lay === 'modern' ? (
        <div className={`border-b-2 ${wide ? 'py-16 px-8' : 'p-6'}`} style={{ background: '#131A22', borderColor: accent }}>
          <div className={inner}>{heroTxt(false, true)}</div>
        </div>
      ) : (
        <div className={`rounded-b-3xl ${wide ? 'py-16 px-8' : 'p-7'}`}
             style={{ background: `color-mix(in srgb, ${accent} 9%, ${paper})` }}>
          <div className={inner}>{heroTxt(true)}</div>
        </div>
      )}

      {/* Sections de contenu, dans l'ORDRE choisi par le vendeur (voir « Personnaliser ») */}
      {blocks.filter((b) => b.pos === 'before').map((b) => b.node)}

      {/* RAYONS */}
      <div style={styleLine} className={`flex gap-1 mt-4 overflow-x-auto border-b px-4  scrollbar-none ${inner} ${wide ? 'px-8' : ''}`}>
        {rayons.map((r) => (
          <button key={r} type="button" onClick={() => setRayon(r)}
                  className="px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
                  style={rayon === r ? { color: accent, borderColor: accent } : { color: mut(50), borderColor: 'transparent' }}>
            {r}
          </button>
        ))}
      </div>

      {/* GRILLE */}
      {shown.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: mut(45) }}>Aucun produit dans ce rayon pour le moment.</p>
      ) : (
        <div className={`grid gap-4 ${wide ? 'p-8' : 'p-5'} ${inner} ${
          wide ? (lay === 'grid' ? 'grid-cols-5' : 'grid-cols-4') : (lay === 'grid' ? 'grid-cols-3' : 'grid-cols-2')}`}>
          {shown.map((l, i) => <SfCard key={l.id} l={l} i={i} pal={pal} contact={contact} accent={accent} badge={shop.accent2}
                                       sector={shop.sector} seed={seed}
                                       onOpen={() => { if (!openProduct(l, i)) say(contact ? 'Démo — demande de devis via la messagerie NOUT' : 'Démo — fiche produit et achat protégé NOUT') }} />)}
        </div>
      )}

      {blocks.filter((b) => b.pos === 'after').map((b) => b.node)}

      {/* bandeau confiance mutualisé (non désactivable — socle NOUT) */}
      <div style={styleLine} className={`grid grid-cols-4 gap-2 px-5 py-3.5 text-center text-[9px] font-bold uppercase tracking-wide opacity-60 border-t  ${inner} ${wide ? 'px-8 py-5 text-[10.5px]' : ''}`}>
        {(contact
          ? ['Devis gratuit', 'Entreprise vérifiée', 'Interventions 974', 'Messagerie NOUT']
          : ['Protection acheteur', 'Paiement sécurisé', 'Point relais 974', 'Vendeur vérifié']
        ).map((t) => <span key={t}>{t}</span>)}
      </div>

      {/* footer légal (pages générées par NOUT au branchement réel) */}
      <div style={styleLine} className={`px-5 py-4 border-t  ${inner} ${wide ? 'px-8 py-7' : ''}`}>
        <div className="flex gap-4 flex-wrap text-[10.5px] mb-3" style={{ color: mut(48) }}>
          {(contact
            ? ['CGV', 'Mentions légales', 'Confidentialité', 'Contact']
            : ['CGV', 'Livraison & retours', 'Mentions légales', 'Confidentialité', 'Contact']
          ).map((t) => (
            <button key={t} type="button"
                    onClick={() => browsable ? setView({ kind: 'legal', page: t }) : say('Page « ' + t +' » générée par NOUT')}
                    className={browsable ? 'hover:underline' : 'cursor-default'}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[12px]" style={{ color: mut(58) }}>
            Propulsé par <span className="font-extrabold" style={{ color: dark ? '#17B3A6' : '#0E8C82' }}>NOUT</span> · Paiement sécurisé
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ color: '#0B716A', background: '#EAF5F3' }}>
            Paiement protégé
          </span>
        </div>
      </div>

      {isOwner && (
        <div className="px-5 pb-5">
          <button type="button" className="btn-primary w-full text-sm py-2.5">Personnaliser ma boutique</button>
        </div>
      )}
      {toast && <Toast msg={toast} />}
    </div>
  )
}

function Toast({ msg }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-nout-dark text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl pointer-events-none">
      {msg}
    </div>
  )
}
