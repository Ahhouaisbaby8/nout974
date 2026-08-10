import { useMemo, useState } from 'react'
import { computeProtectionFee, computeBuyerTotal } from '../utils/shipping'
import { formatPrice } from '../utils/formatters'
import { FONTS, stockImg, heroImg } from './pro/proData'

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

const LAYS = {
  epuree: 'minimal', vitrine: 'hero', marche: 'market', douce: 'soft', moderne: 'modern',
  grille: 'grid', lumina: 'hero', pure: 'minimal', studio: 'grid', active: 'modern',
  marmaille: 'soft', ecrin: 'soft', conseil: 'minimal', terrain: 'hero', bio: 'bio', classic: 'minimal',
  galerie: 'hero', metier: 'market', spot: 'bio', botanique: 'soft',
}
const DARKS = new Set(['moderne', 'lumina', 'active', 'bio'])

function Stars({ i }) {
  const rating = (4.5 + ((i * 7) % 5) / 10).toFixed(1).replace('.', ',')
  const count = 6 + (i * 13) % 38
  return <p className="text-[10.5px] text-amber-600/90 mt-0.5 font-medium">★ {rating} ({count})</p>
}

function SfCard({ l, i, dark, contact, accent, sector, seed = 0, onOpen }) {
  const img = l.images?.[0]
  // 2e visuel au survol : la vraie 2e photo du produit si elle existe, sinon une image
  // d'ambiance de l'univers (pattern des meilleures boutiques : 8/19 des sites étudiés).
  const img2 = l.images?.[1] || stockImg(sector, i + 1, seed)
  const nPhotos = l.images?.length || 0
  return (
    <button type="button" onClick={onOpen}
            className={`group text-left rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5 ${dark ? '' : 'bg-white'}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
        {img && <img src={img} alt={l.title} loading="lazy"
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        {img2 && img2 !== img && (
          <img src={img2} alt="" loading="lazy"
               className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}
        {i === 0 && <span className="absolute top-2 left-2 text-[8.5px] font-bold uppercase tracking-wide bg-white text-nout-texte px-2 py-0.5 rounded-full shadow-sm">Plus vendu</span>}
        {i === 3 && <span className="absolute top-2 left-2 text-[8.5px] font-bold uppercase tracking-wide bg-white text-nout-texte px-2 py-0.5 rounded-full shadow-sm">Nouveau</span>}
        {nPhotos > 1 && (
          <span className="absolute bottom-2 right-2 flex gap-1 opacity-80" aria-label={`${nPhotos} photos`}>
            {l.images.slice(0, 5).map((_, k) => (
              <span key={k} className={`w-1.5 h-1.5 rounded-full ${k === 0 ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </span>
        )}
      </div>
      <div className="pt-2 px-0.5 pb-1">
        <p className={`text-[12.5px] font-medium truncate ${dark ? 'text-white/90' : 'text-nout-texte'}`}>{l.title}</p>
        {/* « Sur devis » aussi quand le prix est absent : sans cette garde, computeBuyerTotal(null)
            afficherait 0,25 € (la part fixe de la protection) sur un produit sans prix. */}
        {contact || !(Number(l.price) > 0) ? (
          <p className="text-[13px] font-bold mt-0.5" style={{ color: accent }}>Sur devis</p>
        ) : (
          <>
            <Stars i={i} />
            <p className={`text-[15px] font-bold mt-0.5 tabular-nums ${dark ? 'text-white' : 'text-nout-texte'}`}>
              {formatPrice(computeBuyerTotal(l.price, 'hand'))}
            </p>
            <p className={`text-[10px] ${dark ? 'text-white/45' : 'text-gray-400'}`}>
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
export default function ShopPage({ shop, listings = [], isOwner = false, wide = false }) {
  const accent = shop.accent_color || '#0E8C82'
  const lay = LAYS[shop.template_key] || 'minimal'
  const dark = DARKS.has(shop.template_key)
  const contact = shop.mode === 'contact'
  const titleFam = (FONTS[shop.font_key] || FONTS.montserrat).fam
  const rayons = ['Tout', ...(shop.rayons || [])]
  const [rayon, setRayon] = useState('Tout')
  const [toast, setToast] = useState('')
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2400) }

  const shown = rayon === 'Tout' ? listings : listings.filter((l) => l.rayon === rayon)
  const best = useMemo(() => listings.slice(0, wide ? 4 : 3), [listings, wide])
  const seed = shop.imgSeed || 0
  const hImg = heroImg(shop.sector || 'Autre', shop.heroIdx ?? seed)

  const bg = dark ? 'bg-[#10151C] text-white' : lay === 'market' ? 'bg-[#FBF6EE] text-nout-texte' : 'bg-white text-nout-texte'
  const line = dark ? 'border-white/10' : 'border-gray-100'
  const secTitle = { fontFamily: titleFam }
  // En grand écran, les fonds restent pleine largeur mais le CONTENU est centré et borné
  // (comportement de tous les vrais sites : une ligne de texte de 1600 px est illisible).
  const inner = wide ? 'max-w-[1280px] mx-auto w-full' : ''

  // ── Page « Lien en bio » : structure dédiée, pas de catalogue ──
  if (lay === 'bio') {
    // deux ambiances possibles : sombre (Bio) ou claire (Spot)
    return (
      <div className={`min-h-[70vh] ${dark ? 'bg-[#10151C] text-white' : 'bg-[#FBFAF7] text-nout-texte'}`}>
        <title>{`${shop.name} — Liens`}</title>
        <div className="max-w-md mx-auto px-5 py-12 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden ring-2 ${dark ? 'ring-white/20' : 'ring-black/10'}`}>
            <img src={hImg} alt="" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold" style={secTitle}>{shop.name}</h1>
          <p className={`text-[13px] mt-1 ${dark ? 'text-white/60' : 'text-gray-500'}`}>{shop.tagline}</p>
          <p className={`text-[12px] mt-2 leading-relaxed ${dark ? 'text-white/45' : 'text-gray-400'}`}>{shop.description}</p>
          <div className="flex flex-col gap-3 mt-7">
            {(shop.links || []).map((lk) => (
              <button key={lk.title} type="button"
                      onClick={() => say(lk.kind === 'shop' ? 'Démo — renvoie vers sa boutique NOUT' : 'Démo — lien externe du créateur')}
                      className={`w-full py-3.5 rounded-2xl text-[14px] font-semibold border transition-colors ${
                        dark ? 'border-white/15 hover:border-white/40' : 'border-black/10 bg-white hover:border-black/30'}`}
                      style={lk.kind === 'shop' ? { background: accent, borderColor: accent, color: '#fff' } : {}}>
                {lk.title}
              </button>
            ))}
          </div>
          <p className={`text-[11px] mt-8 ${dark ? 'text-white/35' : 'text-gray-400'}`}>
            Propulsé par <span className="font-bold" style={{ color: accent }}>NOUT</span> · Paiement protégé sur la boutique
          </p>
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    )
  }

  const heroTxt = (center = false) => (
    <div className={center ? 'text-center flex flex-col items-center' : ''}>
      <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: dark ? '#fff' : accent }}>Boutique</p>
      <h1 className={`leading-tight font-bold mt-2 max-w-[24ch] ${wide ? 'text-[40px]' : 'text-[24px]'}`} style={secTitle}>{shop.tagline}</h1>
      <p className={`leading-relaxed mt-3 max-w-[46ch] ${wide ? 'text-[15px]' : 'text-[13px]'} ${dark ? 'text-white/70' : 'text-gray-500'}`}>{shop.description}</p>
      <button type="button" onClick={() => say(contact ? 'Démo — ouvre la messagerie NOUT (devis)' : 'Voir les produits ci-dessous')}
              className={`mt-4 rounded-full font-bold text-white w-fit ${wide ? 'px-7 py-3 text-[14px]' : 'px-5 py-2.5 text-[13px]'}`}
              style={{ background: accent }}>
        {contact ? 'Demander un devis' : 'Découvrir'}
      </button>
      <p className={`text-[11px] mt-3 ${dark ? 'text-white/50' : 'text-gray-400'}`}>★ 4,9 · {contact ? '38 avis clients' : '47 ventes'} · Vendeur vérifié NOUT</p>
    </div>
  )

  return (
    <div className={`${bg} min-h-[70vh]`}>
      <title>{`${shop.name} — Boutique NOUT 974`}</title>
      <meta name="description" content={shop.tagline || `La boutique ${shop.name} sur NOUT.`} />

      {/* barre d'annonce (promesse escrow — pattern 14/19 des meilleurs sites) */}
      <div className="text-center text-[9.5px] font-bold uppercase tracking-wider py-1.5 px-3 text-white"
           style={{ background: accent }}>
        {contact
          ? 'Devis gratuit sous 24 h · Échanges sécurisés via NOUT'
          : "Votre argent est protégé jusqu'à réception · Livraison en point relais dès 4 €"}
      </div>

      {/* header : wordmark typographié (pas de pastille-lettre) */}
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${line} ${inner} ${wide ? 'px-8 py-5' : ''}`}>
        <span className="text-[16px] font-bold truncate" style={secTitle}>{shop.name}</span>
        <div className={`hidden sm:flex gap-4 text-[12px] ${dark ? 'text-white/55' : 'text-gray-400'}`}>
          <span>Boutique</span><span>Nouveautés</span><span>À propos</span>
        </div>
        <button type="button" onClick={() => say('Démo — panier et paiement sécurisé NOUT')}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${dark ? 'border-white/20' : 'border-gray-200'}`}
                aria-label="Panier">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12h11l1.6-8H6"/></svg>
        </button>
      </div>

      {/* USP */}
      <div className={`flex justify-center gap-4 flex-wrap py-2 px-4 text-[9.5px] font-bold uppercase tracking-wide opacity-55 border-b ${line} ${wide ? 'py-3 text-[10.5px] gap-8' : ''}`}>
        <span>Livraison 974</span><span>{contact ? 'Devis sous 24 h' : 'Retours 14 jours'}</span><span>Paiement sécurisé</span>
      </div>

      {/* HERO par layout */}
      {lay === 'hero' ? (
        <div className={`relative flex flex-col justify-end text-white ${wide ? 'min-h-[380px] p-10' : 'min-h-[230px] p-5'}`}
             style={{ background: `linear-gradient(180deg, rgba(8,12,24,.12), rgba(8,12,24,.68)), url(${hImg}) center/cover` }}>
          <div className={inner}>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/90">Boutique</p>
            <h1 className={`leading-tight font-bold mt-1 max-w-[24ch] ${wide ? 'text-[40px]' : 'text-[24px]'}`} style={secTitle}>{shop.tagline}</h1>
            <p className={`text-white/85 mt-2 max-w-[46ch] ${wide ? 'text-[15px]' : 'text-[13px]'}`}>{shop.description}</p>
            <button type="button" onClick={() => say(contact ? 'Démo — ouvre la messagerie NOUT (devis)' : 'Voir les produits ci-dessous')}
                    className={`mt-3 rounded-full font-bold w-fit text-white ${wide ? 'px-7 py-3 text-[14px]' : 'px-5 py-2.5 text-[13px]'}`}
                    style={{ background: accent }}>
              {contact ? 'Demander un devis' : 'Découvrir'}
            </button>
          </div>
        </div>
      ) : lay === 'minimal' ? (
        // en étroit, on empile (texte puis image) : côte à côte, la colonne de texte
        // tombe à ~190 px et le titre se casse en bouillie sur téléphone
        <div className={`flex items-stretch ${wide ? 'max-w-[1600px] mx-auto' : 'flex-col sm:flex-row'}`}>
          <div className={`flex-1 min-w-0 flex flex-col justify-center ${wide ? 'py-16 pl-[max(2rem,calc((100vw-1280px)/2))] pr-12' : 'p-6'}`}>{heroTxt()}</div>
          <div className={`flex-1 ${wide ? 'min-h-[440px]' : 'h-[210px] sm:h-auto sm:min-h-[230px]'}`}>
            <img src={hImg} alt="" className="w-full h-full object-cover" />
          </div>
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
          <div className={inner}>{heroTxt()}</div>
        </div>
      ) : (
        <div className={`rounded-b-3xl ${wide ? 'py-16 px-8' : 'p-7'}`}
             style={{ background: dark ? undefined : `color-mix(in srgb, ${accent} 9%, #fff)` }}>
          <div className={inner}>{heroTxt(true)}</div>
        </div>
      )}

      {/* BEST-SELLERS (15/19 des meilleurs sites) */}
      {!contact && best.length > 0 && (
        <div className={`${wide ? 'px-8 pt-9' : 'px-5 pt-5'} ${inner}`}>
          <h2 className={`font-bold mb-3 ${wide ? 'text-[19px]' : 'text-[15px]'}`} style={secTitle}>Nos best-sellers</h2>
          <div className={`grid gap-3 ${wide ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {best.map((l, i) => <SfCard key={l.id} l={l} i={i} dark={dark} contact={contact} accent={accent}
                                        sector={shop.sector} seed={seed} onOpen={() => say('Démo — fiche produit et achat protégé NOUT')} />)}
          </div>
        </div>
      )}

      {/* RAYONS */}
      <div className={`flex gap-1 mt-4 overflow-x-auto border-b px-4 ${line} scrollbar-none ${inner} ${wide ? 'px-8' : ''}`}>
        {rayons.map((r) => (
          <button key={r} type="button" onClick={() => setRayon(r)}
                  className="px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
                  style={rayon === r ? { color: accent, borderColor: accent } : { color: dark ? 'rgba(255,255,255,.45)' : '#9AA5A0', borderColor: 'transparent' }}>
            {r}
          </button>
        ))}
      </div>

      {/* GRILLE */}
      {shown.length === 0 ? (
        <p className={`text-center py-12 text-sm ${dark ? 'text-white/40' : 'text-gray-400'}`}>Aucun produit dans ce rayon pour le moment.</p>
      ) : (
        <div className={`grid gap-4 ${wide ? 'p-8' : 'p-5'} ${inner} ${
          wide ? (lay === 'grid' ? 'grid-cols-5' : 'grid-cols-4') : (lay === 'grid' ? 'grid-cols-3' : 'grid-cols-2')}`}>
          {shown.map((l, i) => <SfCard key={l.id} l={l} i={i} dark={dark} contact={contact} accent={accent}
                                       sector={shop.sector} seed={seed}
                                       onOpen={() => say(contact ? 'Démo — demande de devis via la messagerie NOUT' : 'Démo — fiche produit et achat protégé NOUT')} />)}
        </div>
      )}

      {/* AVIS (exemples — le réel n'affichera que des avis NOUT vérifiés et datés) */}
      <div className={`px-5 py-5 border-t ${line} ${inner} ${wide ? 'px-8 py-8' : ''}`}>
        <h2 className="text-[15px] font-bold" style={secTitle}>Ils ont {contact ? 'fait appel à nous' : 'commandé'}</h2>
        <p className="text-[12px] font-bold text-amber-600/90 mt-1 mb-3">★ 4,9 / 5 — avis d'exemple (démo). Les vrais avis NOUT apparaîtront ici.</p>
        <blockquote className={`text-[12.5px] leading-relaxed ${dark ? 'text-white/75' : 'text-gray-600'}`}>
          « {contact ? 'Devis clair, travail propre, je recommande.' : 'Reçu en 2 jours au point relais, qualité au top.'} »
          <span className={`block text-[11px] mt-0.5 ${dark ? 'text-white/45' : 'text-gray-400'}`}>— Mélissa · Saint-Denis</span>
        </blockquote>
      </div>

      {/* L'ATELIER (ancrage local 12/19) */}
      <div className={`flex items-center gap-4 px-5 py-5 border-t ${line} ${inner} ${wide ? 'px-8 py-8 gap-8' : ''}`}>
        <div className={`rounded-xl overflow-hidden flex-shrink-0 ${wide ? 'w-44 h-44' : 'w-24 h-24'}`}>
          <img src={stockImg(shop.sector || 'Autre', 1, seed)} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold" style={secTitle}>{contact ? "L'équipe" : "L'atelier"}</h2>
          <p className={`text-[12px] leading-relaxed mt-1 ${dark ? 'text-white/60' : 'text-gray-500'}`}>
            Une {contact ? 'entreprise' : 'boutique'} indépendante de La Réunion. Chaque {contact ? 'projet est suivi' : 'commande est préparée'} avec soin.
          </p>
          <p className={`text-[11px] mt-1.5 ${dark ? 'text-white/40' : 'text-gray-400'}`}>La Réunion (974) · Vendeur vérifié NOUT</p>
        </div>
      </div>

      {/* COMMENT ÇA MARCHE (l'escrow en langage client) */}
      <div className={`px-5 py-5 border-t ${line} ${inner} ${wide ? 'px-8 py-8' : ''}`}>
        <h2 className="text-[15px] font-bold mb-3" style={secTitle}>Comment ça marche</h2>
        <div className="grid grid-cols-3 gap-3 text-[11px] leading-relaxed opacity-80">
          {(contact
            ? [['1. Je décris', 'Mon besoin en 2 minutes'], ['2. Je reçois un devis', 'Réponse sous 24 h'], ['3. On planifie', 'Échanges via la messagerie NOUT']]
            : [['1. Je commande', 'Paiement sécurisé en ligne'], ['2. Mon argent est protégé', "Conservé en sécurité jusqu'à réception"], ['3. Je reçois', 'Point relais 974, domicile ou main propre']]
          ).map(([t, s]) => (
            <div key={t}><b className="block mb-0.5" style={{ color: accent }}>{t}</b>{s}</div>
          ))}
        </div>
      </div>

      {/* bandeau confiance mutualisé (non désactivable — socle NOUT) */}
      <div className={`grid grid-cols-4 gap-2 px-5 py-3.5 text-center text-[9px] font-bold uppercase tracking-wide opacity-60 border-t ${line} ${inner} ${wide ? 'px-8 py-5 text-[10.5px]' : ''}`}>
        {(contact
          ? ['Devis gratuit', 'Entreprise vérifiée', 'Interventions 974', 'Messagerie NOUT']
          : ['Protection acheteur', 'Paiement sécurisé', 'Point relais 974', 'Vendeur vérifié']
        ).map((t) => <span key={t}>{t}</span>)}
      </div>

      {/* footer légal (pages générées par NOUT au branchement réel) */}
      <div className={`px-5 py-4 border-t ${line} ${inner} ${wide ? 'px-8 py-7' : ''}`}>
        <div className={`flex gap-4 flex-wrap text-[10.5px] mb-3 ${dark ? 'text-white/45' : 'text-gray-400'}`}>
          {(contact
            ? ['CGV', 'Mentions légales', 'Confidentialité', 'Contact']
            : ['CGV', 'Livraison & retours', 'Mentions légales', 'Confidentialité', 'Contact']
          ).map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className={`text-[12px] ${dark ? 'text-white/55' : 'text-gray-500'}`}>
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
