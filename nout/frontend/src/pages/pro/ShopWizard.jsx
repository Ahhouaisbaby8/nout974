import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ShopPage from '../ShopPage'
import {
  THEMES, themeById, FONTS, FONT_CONTEXTS, SECTORS, SECS_MAIN, SECTOR_LABEL, familyOf,
  DEMOS, detectSector, genTagline, genDescription,
  RESERVED_SLUGS, slugify, stockImg, loadProFonts, demoListings,
} from './proData'

// ─── NOUT Pro : WIZARD de création de boutique (DEV ONLY — /boutique-creer) ─────────
// Portage React de la démo validée (artifact v15). « IA » simulée/déterministe :
// détection d'univers par mots-clés, textes à modèles, thème conseillé — l'effet vient
// de l'ANIMATION de génération. Aucune base touchée : tout l'état est local ; le
// branchement réel (table `shops` + listings taggés) viendra après validation.
// Aucun code argent ici (l'achat passe par le tunnel NOUT existant).

const GEN_TASKS = [
  'Analyse de ta marque',
  'Application du thème',
  'Classement de tes produits en rayons',
  'Ajout de tes produits',
  'Rédaction de tes textes',
  'Pages légales : CGV, retours, mentions',
  'Optimisation Google : titre, description, sitemap',
  'Activation du paiement sécurisé NOUT',
]
const NAME_IDEAS = ['Vanille Bleue', 'Kaz Soleil', 'Péi Style', 'Fler de Sel']

// Extraction de la couleur dominante d'un logo (lecture réelle des pixels — pas d'API)
function extractAccent(img) {
  try {
    const n = 44
    const c = document.createElement('canvas'); c.width = n; c.height = n
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0, n, n)
    const d = x.getImageData(0, 0, n, n).data
    let r = 0, g = 0, b = 0, w = 0
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3]
      if (A < 130) continue
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B)
      const light = (mx + mn) / 2, sat = mx - mn
      if (light > 236 || light < 16) continue
      const ww = 1 + sat / 26
      r += R * ww; g += G * ww; b += B * ww; w += ww
    }
    if (w < 3) return null
    const hex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
    return '#' + hex(r / w) + hex(g / w) + hex(b / w)
  } catch { return null }
}

const PALETTE = ['#0E8C82', '#0E7FAB', '#1A3A8F', '#4FA9E0', '#4E7C4E', '#7BA05B', '#C24E3B', '#B5563F',
  '#D98A2B', '#C8A24B', '#C86B8E', '#8B5CF6', '#5B5F97', '#37415C', '#16202E']

export default function ShopWizard() {
  const location = useLocation()
  const [step, setStep] = useState('activite')            // activite → theme → identite → accroche → produits → gen → result
  const [name, setName] = useState('')
  const [sector, setSector] = useState(null)
  const [sectorTouched, setSectorTouched] = useState(false)   // choix manuel : ne plus deviner
  const [theme, setTheme] = useState(null)
  const [fromGallery, setFromGallery] = useState(false)
  const [accent, setAccent] = useState('#0E8C82')
  const [accCustom, setAccCustom] = useState(false)
  const [logo, setLogo] = useState(null)
  const [fontKey, setFontKey] = useState('montserrat')
  const [phrase, setPhrase] = useState('')
  const [products, setProducts] = useState([])
  const [genStep, setGenStep] = useState(-1)
  const [showAllFonts, setShowAllFonts] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadProFonts() }, [])

  // Arrivée depuis la galerie (/boutique-templates) : thème + univers déjà répondus
  useEffect(() => {
    const id = location.state?.template
    if (id && DEMOS[id]) {
      const d = DEMOS[id]; const t = themeById(d.template)
      setTheme(t); setSector(d.sector); setFontKey(t.font); setAccent(t.acc); setFromGallery(true)
    }
  }, [location.state])

  // « IA » déterministe : devine l'univers depuis le nom tant que le pro n'a rien choisi
  useEffect(() => {
    if (sectorTouched || fromGallery || !name.trim()) return
    const guess = detectSector(name)
    if (guess !== 'Autre') setSector(guess)
  }, [name, sectorTouched, fromGallery])

  const slug = slugify(name)
  const slugOk = slug.length >= 3 && !RESERVED_SLUGS.has(slug)
  const family = sector ? familyOf(sector) : null
  const rayons = SECTORS[sector]?.rayons || SECTORS.Autre.rayons
  const contact = theme?.mode === 'contact'

  const shop = useMemo(() => ({
    slug: slug || 'ma-boutique', name: name || 'Ma boutique',
    tagline: phrase || genTagline(sector || 'Autre'),
    description: genDescription(sector || 'Autre'),
    accent_color: accent, font_key: fontKey,
    template_key: theme?.id || 'epuree', mode: theme?.mode || 'escrow',
    sector: sector || 'Autre', rayons,
    links: theme?.mode === 'bio' ? (DEMOS.bio.links) : null,
  }), [slug, name, phrase, sector, accent, fontKey, theme, rayons])

  const listings = useMemo(() => {
    if (products.length) {
      return products.map((p, i) => ({
        id: 'w-' + i, title: p.title, price: p.price, rayon: rayons[(i % Math.max(rayons.length - 1, 1)) + (rayons.length > 1 ? 1 : 0)],
        city: 'Saint-Denis', created_at: new Date().toISOString(), is_sold: false,
        images: p.photos?.length ? p.photos : [stockImg(sector || 'Autre', i)],
      }))
    }
    const demoKey = theme && DEMOS[theme.id] ? theme.id : 'epuree'
    const base = DEMOS[demoKey].sector === sector ? DEMOS[demoKey] : { ...DEMOS[demoKey], sector: sector || 'Autre' }
    return demoListings(base).map((l, i) => ({ ...l, images: [stockImg(sector || 'Autre', i)] }))
  }, [products, theme, sector, rayons])

  const recoFonts = FONT_CONTEXTS[sector || 'Autre'] || FONT_CONTEXTS.Autre
  const fontList = showAllFonts ? Object.keys(FONTS) : [...new Set([...recoFonts, fontKey])]

  const pickTheme = (t) => { setTheme(t); setFontKey(t.font); if (!accCustom) setAccent(t.acc) }
  const onLogo = (file) => {
    if (!file || !/^image\//.test(file.type)) return
    const rd = new FileReader()
    rd.onload = (e) => {
      const img = new Image()
      img.onload = () => { setLogo(e.target.result); const a = extractAccent(img); if (a) { setAccent(a); setAccCustom(true) } }
      img.src = e.target.result
    }
    rd.readAsDataURL(file)
  }

  const startGen = () => {
    setStep('gen'); setGenStep(0)
    let i = 0
    const tick = () => {
      i += 1
      if (i >= GEN_TASKS.length) { setGenStep(GEN_TASKS.length); setTimeout(() => setStep('result'), 500); return }
      setGenStep(i); setTimeout(tick, 850 + (i % 3) * 150)
    }
    setTimeout(tick, 900)
  }

  const stepIdx = ['activite', 'theme', 'identite', 'accroche', 'produits'].indexOf(step)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <title>Crée ta boutique — NOUT Pro</title>
      <div className="flex items-center gap-3 mb-5">
        <p className="font-title font-extrabold text-nout-texte">NOUT <span className="text-[11px] font-bold text-nout-turquoise bg-[#EAF5F3] px-2 py-0.5 rounded-full align-middle">Pro</span></p>
        <div className="flex-1" />
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">Aperçu — rien n'est enregistré pour l'instant</span>
      </div>

      {/* stepper */}
      {stepIdx >= 0 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto">
          {['Activité', 'Thème', 'Identité', 'Accroche', 'Produits'].map((l, i) => (
            <div key={l} className="flex items-center gap-2 flex-shrink-0">
              <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center border
                ${i === stepIdx ? 'bg-nout-turquoise border-nout-turquoise text-white'
                  : i < stepIdx || (i === 1 && fromGallery && stepIdx > 1) ? 'bg-[#EAF5F3] border-transparent text-[#0B716A]' : 'bg-white border-gray-200 text-gray-400'}`}>
                {i + 1}
              </span>
              <span className={`text-[12px] font-semibold hidden sm:inline ${i === stepIdx ? 'text-nout-texte' : 'text-gray-400'}`}>{l}</span>
              {i < 4 && <span className="w-5 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      )}

      <div className={`grid gap-6 ${stepIdx >= 0 && step !== 'theme' ? 'lg:grid-cols-2' : ''}`}>
        {/* ── colonne formulaire ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {step === 'activite' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Étape 1</p>
              <h1 className="font-title text-xl font-bold text-nout-texte mb-4">Ton activité</h1>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Nom de la boutique</label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} maxLength={42}
                     placeholder="Ex. Vibe 974" autoComplete="off" />
              <p className="flex items-center gap-2 mt-3 px-3.5 py-2.5 bg-[#EAF5F3] rounded-lg text-[12.5px] font-semibold text-[#0B716A]">
                Ton adresse : nout.re/<b>{slug || '…'}</b>
              </p>
              {slug && RESERVED_SLUGS.has(slug) && <p className="text-[12px] text-amber-700 mt-2">Cette adresse est réservée — choisis un autre nom.</p>}
              <div className="flex gap-2 flex-wrap items-center mt-3">
                <span className="text-[11.5px] font-bold text-gray-400">Idées :</span>
                {NAME_IDEAS.map((n) => (
                  <button key={n} type="button" onClick={() => setName(n)}
                          className="text-[12px] font-medium text-gray-500 bg-white border border-gray-200 hover:border-nout-turquoise px-3 py-1.5 rounded-full">{n}</button>
                ))}
              </div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mt-5 mb-2">Que vends-tu ?</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SECS_MAIN.map((k) => (
                  <button key={k} type="button"
                          onClick={() => { setSectorTouched(true); if (family !== k) setSector(k) }}
                          className={`px-2 py-2.5 rounded-xl border text-[12.5px] transition-colors
                            ${family === k ? 'border-nout-turquoise bg-[#EAF5F3] text-[#0B716A] font-semibold' : 'border-gray-200 text-nout-texte hover:border-gray-300'}`}>
                    {SECTOR_LABEL[k] || k}
                  </button>
                ))}
              </div>
              <button type="button" disabled={!slugOk || !sector} onClick={() => setStep(fromGallery && theme ? 'identite' : 'theme')}
                      className="btn-primary w-full mt-6 disabled:opacity-40 disabled:cursor-not-allowed">Continuer</button>
            </>
          )}

          {step === 'theme' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Étape 2</p>
              <h1 className="font-title text-xl font-bold text-nout-texte mb-1">Choisis ton thème</h1>
              <p className="text-[13px] text-gray-500 mb-4">Les thèmes conseillés pour ton univers d'abord — tout se personnalise après.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...THEMES].sort((a, b) => {
                  const reco = SECTORS[sector]?.themes || []
                  const ai = reco.indexOf(a.id), bi = reco.indexOf(b.id)
                  return (ai < 0 ? 9 : ai) - (bi < 0 ? 9 : bi)
                }).map((t) => (
                  <button key={t.id} type="button" onClick={() => pickTheme(t)}
                          className={`text-left rounded-xl border p-3 transition-all ${theme?.id === t.id ? 'border-nout-turquoise ring-2 ring-nout-turquoise/20' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="block w-7 h-7 rounded-lg mb-2" style={{ background: t.acc }} />
                    <p className="text-[13px] font-bold text-nout-texte">{t.name}</p>
                    <p className="text-[11px] text-gray-400 leading-snug">{t.vibe}</p>
                    {(SECTORS[sector]?.themes || []).includes(t.id) &&
                      <span className="inline-block mt-1.5 text-[9px] font-bold uppercase text-[#0B716A] bg-[#EAF5F3] px-1.5 py-0.5 rounded-full">Conseillé</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setStep('activite')} className="btn-secondary flex-1">Retour</button>
                <button type="button" disabled={!theme} onClick={() => setStep('identite')} className="btn-primary flex-1 disabled:opacity-40">Continuer</button>
              </div>
            </>
          )}

          {step === 'identite' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Étape 3</p>
              <h1 className="font-title text-xl font-bold text-nout-texte mb-1">Ton identité</h1>
              <p className="text-[13px] text-gray-500 mb-4">Dépose ton logo — on en tire ta couleur de marque automatiquement.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files[0])} />
              {logo ? (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                  <img src={logo} alt="Logo" className="w-14 h-14 rounded-xl object-cover" />
                  <div>
                    <p className="text-[13px] font-semibold text-nout-texte">Couleur détectée
                      <span className="inline-block w-3.5 h-3.5 rounded ml-2 align-middle" style={{ background: accent }} /></p>
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-[12.5px] font-semibold text-nout-turquoise">Changer</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 hover:border-nout-turquoise rounded-xl py-6 text-[13px] font-semibold text-gray-500">
                  Dépose ton logo (PNG ou JPG)
                </button>
              )}
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mt-4 mb-2">Ou choisis une couleur</label>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map((c) => (
                  <button key={c} type="button" aria-label={`Couleur ${c}`} onClick={() => { setAccent(c); setAccCustom(true) }}
                          className={`w-8 h-8 rounded-lg border-2 ${accent === c ? 'border-nout-texte' : 'border-transparent'}`}
                          style={{ background: c }} />
                ))}
                <label className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer relative border-2 border-transparent"
                       style={{ background: 'conic-gradient(#E4572E,#E8B93E,#4E9E5B,#0E8C82,#1A3A8F,#8B5CF6,#C86B8E,#E4572E)' }}
                       title="Couleur personnalisée">
                  <input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); setAccCustom(true) }}
                         className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              </div>
              <div className="flex items-center justify-between mt-4 mb-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  Police des titres {!showAllFonts && <span className="normal-case font-semibold text-gray-400">— conseillées pour {SECTOR_LABEL[sector] || 'ton univers'}</span>}
                </label>
                <button type="button" onClick={() => setShowAllFonts(!showAllFonts)} className="text-[12px] font-semibold text-nout-turquoise">
                  {showAllFonts ? 'Voir les conseillées' : `Toutes (${Object.keys(FONTS).length})`}
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {fontList.map((k) => (
                  <button key={k} type="button" onClick={() => setFontKey(k)}
                          className={`rounded-xl border px-2 py-2.5 text-center ${fontKey === k ? 'border-nout-turquoise bg-[#EAF5F3]' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="block text-[19px] leading-none text-nout-texte" style={{ fontFamily: FONTS[k].fam }}>Ag</span>
                    <span className="block text-[10px] font-semibold text-gray-500 mt-1">{FONTS[k].label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => { setFromGallery(false); setStep('theme') }} className="btn-secondary flex-1">Retour</button>
                <button type="button" onClick={() => setStep('accroche')} className="btn-primary flex-1">Continuer</button>
              </div>
            </>
          )}

          {step === 'accroche' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Étape 4</p>
              <h1 className="font-title text-xl font-bold text-nout-texte mb-1">Ton accroche</h1>
              <p className="text-[13px] text-gray-500 mb-4">Une phrase qui te résume — elle devient le titre de ta vitrine.</p>
              <textarea className="input-field resize-none min-h-[90px]" maxLength={120} value={phrase}
                        onChange={(e) => setPhrase(e.target.value)} placeholder={genTagline(sector || 'Autre')} />
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setStep('identite')} className="btn-secondary flex-1">Retour</button>
                <button type="button" onClick={() => setStep('produits')} className="btn-primary flex-1">Continuer</button>
              </div>
            </>
          )}

          {step === 'produits' && (
            <ProductsStep products={products} setProducts={setProducts} sector={sector} contact={contact}
                          onBack={() => setStep('accroche')} onGenerate={startGen} />
          )}

          {step === 'gen' && (
            <div className="py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Génération</p>
              <h1 className="font-title text-xl font-bold text-nout-texte mb-5">
                {genStep >= GEN_TASKS.length ? 'Ta boutique est prête.' : GEN_TASKS[Math.min(genStep, GEN_TASKS.length - 1)] + '…'}
              </h1>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-5">
                <div className="h-full bg-nout-turquoise transition-all duration-500"
                     style={{ width: `${Math.round(Math.min(genStep + 1, GEN_TASKS.length) / GEN_TASKS.length * 100)}%` }} />
              </div>
              <div className="flex flex-col gap-1">
                {GEN_TASKS.map((t, i) => (
                  <div key={t} className={`flex items-center gap-3 py-1.5 text-[13.5px] ${i < genStep ? 'text-nout-texte' : i === genStep ? 'text-nout-texte font-semibold' : 'text-gray-300'}`}>
                    {i < genStep ? (
                      <span className="w-5 h-5 rounded-full bg-nout-turquoise flex items-center justify-center flex-shrink-0">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      </span>
                    ) : (
                      <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${i === genStep ? 'border-nout-turquoise border-t-transparent animate-spin' : 'border-gray-200'}`} />
                    )}
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'result' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-nout-turquoise flex items-center justify-center flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
                <div>
                  <p className="font-title font-bold text-nout-texte text-[15px]">Ta boutique est prête</p>
                  <p className="text-[12px] text-gray-500">nout.re/{slug || 'ma-boutique'} · thème {theme?.name || 'Épurée'}</p>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 text-[12.5px] text-gray-600 mb-4">
                {['CGV complètes, mentions légales et confidentialité générées', 'Titre et description optimisés pour Google, sitemap envoyé',
                  'Paiement sécurisé NOUT et livraison 974 branchés', 'Prix affichés TTC, protection acheteur comprise'].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#EAF5F3] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0E8C82" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </span>{t}
                  </li>
                ))}
              </ul>
              <p className="text-[11.5px] text-gray-400 leading-relaxed mb-4">
                Aperçu local : rien n'est enregistré. Le branchement réel (table shops, tes vraies annonces, l'Espace pro)
                arrive à l'étape suivante du chantier.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setStep('produits')} className="btn-secondary flex-1">Produits</button>
                <button type="button" onClick={() => setStep('identite')} className="btn-secondary flex-1">Personnaliser</button>
                <Link to="/boutique-templates" className="btn-secondary flex-1 text-center">Templates</Link>
              </div>
            </div>
          )}
        </div>

        {/* ── colonne aperçu live (cadre navigateur) ── */}
        {(stepIdx >= 0 && step !== 'theme') || step === 'gen' || step === 'result' ? (
          <div className="lg:sticky lg:top-4 self-start">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-nout-turquoise inline-block" /> Aperçu en direct
            </p>
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="flex gap-1.5 text-gray-300">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </span>
                <span className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-500 truncate">
                  nout.re/<b className="text-nout-texte">{slug || 'ma-boutique'}</b>
                </span>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <ShopPage shop={shop} listings={listings} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Étape produits : édition en cartes (le produit se construit comme il s'affichera).
// Jusqu'à 8 photos par produit (les fiches pro montrent plusieurs angles) — le C2C
// classique reste à 5 photos (CreateListing.jsx), volontairement inchangé.
export const MAX_PRO_PHOTOS = 8

function ProductsStep({ products, setProducts, sector, contact, onBack, onGenerate }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [photos, setPhotos] = useState([])
  const fileRef = useRef(null)

  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => /^image\//.test(f.type))
    if (!files.length) return
    const room = MAX_PRO_PHOTOS - photos.length
    files.slice(0, room).forEach((f) => {
      const rd = new FileReader()
      rd.onload = (ev) => setPhotos((prev) => (prev.length >= MAX_PRO_PHOTOS ? prev : [...prev, ev.target.result]))
      rd.readAsDataURL(f)
    })
  }

  const commit = () => {
    const t = title.trim()
    const pr = contact ? null : parseFloat((price || '').replace(',', '.'))
    if (!t || (!contact && !(pr > 0))) return
    setProducts([...products, { title: t, price: pr, photos }])
    setAdding(false); setTitle(''); setPrice(''); setPhotos([])
  }

  return (
    <>
      <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Étape 5</p>
      <h1 className="font-title text-xl font-bold text-nout-texte mb-1">{contact ? 'Tes prestations' : 'Tes produits'}</h1>
      <p className="text-[13px] text-gray-500 mb-4">
        {contact ? 'Liste tes prestations — les clients demandent un devis via la messagerie NOUT.'
          : "Remplis ta boutique carte par carte — chaque produit apparaît en direct dans l'aperçu. Laisse vide : on met des exemples."}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {adding ? (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                   onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
            <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full aspect-[3/4] bg-gray-50 flex items-center justify-center text-[11.5px] font-semibold text-gray-400 overflow-hidden relative">
              {photos[0]
                ? <><img src={photos[0]} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {photos.length}/{MAX_PRO_PHOTOS}</span></>
                : <>Ajouter des photos<br/><span className="text-[10px] font-normal">jusqu'à {MAX_PRO_PHOTOS}</span></>}
            </button>
            {photos.length > 0 && (
              <div className="flex gap-1 flex-wrap p-1.5 pb-0">
                {photos.map((p, k) => (
                  <span key={k} className="relative w-9 h-9 rounded overflow-hidden group/ph">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    {k === 0 && <span className="absolute inset-x-0 bottom-0 bg-nout-turquoise text-white text-[7px] text-center font-bold leading-tight">1re</span>}
                    <button type="button" aria-label="Retirer la photo"
                            onClick={() => setPhotos(photos.filter((_, j) => j !== k))}
                            className="absolute inset-0 bg-black/55 text-white text-xs opacity-0 group-hover/ph:opacity-100">×</button>
                  </span>
                ))}
                {photos.length < MAX_PRO_PHOTOS && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                          className="w-9 h-9 rounded border border-dashed border-gray-300 text-gray-400 text-sm leading-none">+</button>
                )}
              </div>
            )}
            <div className="p-2 flex flex-col gap-1.5">
              <input className="input-field !py-2 !text-[13px]" placeholder={contact ? 'Nom de la prestation' : 'Titre du produit'}
                     value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
              {!contact && <input className="input-field !py-2 !text-[13px]" placeholder="Prix €" inputMode="decimal"
                                  value={price} onChange={(e) => setPrice(e.target.value)} />}
              <div className="flex gap-1.5">
                <button type="button" onClick={commit} className="btn-primary flex-1 !py-2 !text-[12.5px]">Ajouter</button>
                <button type="button" onClick={() => { setAdding(false); setPhotos([]) }} className="text-[12px] font-semibold text-gray-400 px-2">Annuler</button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
                  className="rounded-xl border-2 border-dashed border-gray-300 hover:border-nout-turquoise hover:bg-[#EAF5F3] min-h-[180px] flex flex-col items-center justify-center gap-1 text-[13px] font-semibold text-gray-500">
            <span className="text-2xl font-light text-nout-turquoise">+</span>
            Ajouter {contact ? 'une prestation' : 'un produit'}
          </button>
        )}
        {products.map((p, i) => (
          <div key={i} className="rounded-xl border border-gray-200 overflow-hidden relative">
            <div className="aspect-[3/4] bg-gray-100 relative">
              <img src={p.photos?.[0] || stockImg(sector || 'Autre', i)} alt="" className="w-full h-full object-cover" />
              {p.photos?.length > 1 && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/55 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {p.photos.length} photos
                </span>
              )}
            </div>
            <button type="button" aria-label="Retirer"
                    onClick={() => setProducts(products.filter((_, j) => j !== i))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 text-white text-sm leading-none">×</button>
            <div className="p-2">
              <p className="text-[12.5px] font-semibold text-nout-texte truncate">{p.title}</p>
              <p className="text-[13px] font-bold text-nout-texte">{contact ? 'Sur devis' : formatEuro(p.price)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-6">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">Retour</button>
        <button type="button" onClick={onGenerate} className="btn-primary flex-1">Générer ma boutique</button>
      </div>
    </>
  )
}

function formatEuro(n) {
  return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €'
}
