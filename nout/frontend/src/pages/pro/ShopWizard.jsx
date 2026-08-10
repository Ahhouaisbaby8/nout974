import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ShopPage, { LAYS, TONES } from '../ShopPage'
import {
  THEMES, themeById, FONTS, FONT_CONTEXTS, SECTORS, SECS_MAIN, SECTOR_LABEL, familyOf,
  DEMOS, detectSector, genTagline, genDescription,
  RESERVED_SLUGS, slugify, stockImg, heroImg, heroCount, loadProFonts, demoListings,
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
const DRAFT_KEY = 'nout-pro-brouillon'

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
  // Personnalisation avancée : textes réécrits, ordre des sections, visuels choisis
  const [texts, setTexts] = useState({})
  const [layout, setLayout] = useState([
    { id: 'bs', label: 'Nos best-sellers', on: true, pos: 'before' },
    { id: 'reviews', label: 'Avis clients', on: true, pos: 'after' },
    { id: 'about', label: "L'atelier / L'équipe", on: true, pos: 'after' },
    { id: 'how', label: 'Comment ça marche', on: true, pos: 'after' },
  ])
  const [heroIdx, setHeroIdx] = useState(0)
  const [heroCustom, setHeroCustom] = useState(null)
  const [aboutImage, setAboutImage] = useState(null)
  const [heroLay, setHeroLay] = useState(null)      // null = mise en page du thème
  const [accent2, setAccent2] = useState(null)      // null = même que la principale
  const [bgTone, setBgTone] = useState(null)        // null = fond du thème

  useEffect(() => { loadProFonts() }, [])

  // ── Brouillon : le travail survit à un rechargement ──────────────────────────────
  // Rien n'est encore enregistré côté serveur (la table `shops` n'existe pas), mais
  // perdre une boutique entière sur un F5 ou une coupure était le défaut le plus
  // pénible du wizard. Sauvegarde locale, sur ce navigateur uniquement.
  const [restored, setRestored] = useState(false)
  const [lightDraft, setLightDraft] = useState(false)   // photos écartées faute de place
  const ready = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.name) setName(d.name)
        if (d.sector) { setSector(d.sector); setSectorTouched(!!d.sectorTouched) }
        if (d.themeId && themeById(d.themeId)) setTheme(themeById(d.themeId))
        if (d.accent) { setAccent(d.accent); setAccCustom(!!d.accCustom) }
        if (d.logo) setLogo(d.logo)
        if (d.fontKey) setFontKey(d.fontKey)
        if (d.phrase) setPhrase(d.phrase)
        if (Array.isArray(d.products)) setProducts(d.products)
        if (d.texts) setTexts(d.texts)
        if (Array.isArray(d.layout) && d.layout.length) setLayout(d.layout)
        if (typeof d.heroIdx === 'number') setHeroIdx(d.heroIdx)
        if (d.heroCustom) setHeroCustom(d.heroCustom)
        if (d.aboutImage) setAboutImage(d.aboutImage)
        if (d.heroLay) setHeroLay(d.heroLay)
        if (d.accent2) setAccent2(d.accent2)
        if (d.bgTone) setBgTone(d.bgTone)
        // on ne restaure jamais l'écran d'animation : il n'a de sens qu'en direct
        if (d.step && d.step !== 'gen') setStep(d.step)
        setRestored(true)
      }
    } catch { /* brouillon illisible : on repart proprement */ }
    ready.current = true
  }, [])

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

  // Sauvegarde du brouillon. Les photos importées sont des données en base64 : au-delà
  // du quota du navigateur (~5 Mo), on réenregistre SANS elles plutôt que de tout perdre.
  useEffect(() => {
    if (!ready.current) return
    if (!name.trim() && !products.length) return
    const base = {
      name, sector, sectorTouched, themeId: theme?.id, accent, accCustom, fontKey, phrase,
      texts, layout, heroIdx, heroLay, accent2, bgTone, step,
    }
    const full = { ...base, logo, products, heroCustom, aboutImage }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
      setLightDraft(false)
    } catch {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          ...base, products: products.map((p) => ({ ...p, photos: [] })),
        }))
        setLightDraft(true)
      } catch { /* stockage indisponible (navigation privée) : on continue sans brouillon */ }
    }
  }, [name, sector, sectorTouched, theme, accent, accCustom, logo, fontKey, phrase, products,
      texts, layout, heroIdx, heroCustom, aboutImage, heroLay, accent2, bgTone, step])

  const resetDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* rien à nettoyer */ }
    window.location.reload()
  }

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
    texts, layout, aboutImage, heroIdx, heroImage: heroCustom, hero_lay: heroLay,
    accent2, bg_tone: bgTone,
  }), [slug, name, phrase, sector, accent, fontKey, theme, rayons, texts, layout, aboutImage,
       heroIdx, heroCustom, heroLay, accent2, bgTone])

  const listings = useMemo(() => {
    if (products.length) {
      return products.map((p, i) => ({
        id: 'w-' + i, title: p.title, price: p.price,
        // rayon choisi par le vendeur ; sinon réparti automatiquement dans ses rayons
        rayon: p.rayon || rayons[(i % Math.max(rayons.length - 1, 1)) + (rayons.length > 1 ? 1 : 0)],
        description: p.description, condition: p.condition,
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
        {(name.trim() || products.length > 0) && (
          <button type="button" onClick={resetDraft} className="text-[12px] font-semibold text-gray-400 hover:text-nout-texte">
            Repartir de zéro
          </button>
        )}
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">Aperçu — rien n'est enregistré pour l'instant</span>
      </div>

      {(restored || lightDraft) && (
        <p className="text-[12.5px] text-[#0B716A] bg-[#EAF5F3] rounded-lg px-3.5 py-2.5 mb-4">
          {restored && 'Ton brouillon a été repris là où tu t\'étais arrêté. '}
          {lightDraft
            ? "Tes photos sont trop lourdes pour être gardées en brouillon : elles seront à réimporter si tu recharges la page."
            : 'Il reste enregistré dans ce navigateur, en attendant la vraie sauvegarde en ligne.'}
        </p>
      )}

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

      {/* min-w-0 sur la grille ET ses colonnes : sans ça, l'aperçu impose sa largeur
          minimale et toute la page déborde de l'écran sur téléphone (il fallait
          dézoomer pour lire). Même cause que le débordement corrigé côté admin. */}
      <div className={`grid gap-6 min-w-0 ${(stepIdx >= 0 && step !== 'theme') || step === 'perso' ? 'lg:grid-cols-2' : ''}`}>
        {/* ── colonne formulaire ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 min-w-0">

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
                          rayons={rayons} onBack={() => setStep('accroche')} onGenerate={startGen} />
          )}

          {step === 'perso' && (
            <PersoStep
              shop={shop} sector={sector} accent={accent} setAccent={(c) => { setAccent(c); setAccCustom(true) }}
              fontKey={fontKey} setFontKey={setFontKey} theme={theme} setTheme={pickTheme}
              texts={texts} setTexts={setTexts} layout={layout} setLayout={setLayout}
              phrase={phrase} setPhrase={setPhrase}
              heroIdx={heroIdx} setHeroIdx={setHeroIdx} heroCustom={heroCustom} setHeroCustom={setHeroCustom}
              aboutImage={aboutImage} setAboutImage={setAboutImage}
              heroLay={heroLay} setHeroLay={setHeroLay}
              accent2={accent2} setAccent2={setAccent2} bgTone={bgTone} setBgTone={setBgTone}
              onDone={() => setStep('result')} />
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
              <SiretNotice />
              <p className="text-[11.5px] text-gray-400 leading-relaxed mb-4">
                Aperçu local : rien n'est enregistré. Le branchement réel (table shops, tes vraies annonces, l'Espace pro)
                arrive à l'étape suivante du chantier.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setStep('produits')} className="btn-secondary flex-1">Produits</button>
                <button type="button" onClick={() => setStep('perso')} className="btn-primary flex-1">Personnaliser</button>
                <Link to="/boutique-templates" className="btn-secondary flex-1 text-center">Templates</Link>
              </div>
            </div>
          )}
        </div>

        {/* ── colonne aperçu live (cadre navigateur) ── */}
        {(stepIdx >= 0 && step !== 'theme') || step === 'gen' || step === 'result' || step === 'perso' ? (
          <div className="lg:sticky lg:top-4 self-start min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-nout-turquoise inline-block" /> Aperçu en direct
            </p>
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white min-w-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="flex gap-1.5 text-gray-300">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </span>
                <span className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-500 truncate">
                  nout.re/<b className="text-nout-texte">{slug || 'ma-boutique'}</b>
                </span>
              </div>
              <div className="max-h-[560px] overflow-y-auto overflow-x-hidden">
                <ShopPage shop={shop} listings={listings} browsable />
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

const EMPTY_PRODUCT = { title: '', price: '', description: '', rayon: '', condition: 'neuf', photos: [] }

function ProductsStep({ products, setProducts, sector, contact, rayons, onBack, onGenerate }) {
  // `edit` : index du produit en cours d'édition, 'new' pour un ajout, null si rien
  const [edit, setEdit] = useState(null)
  const [draft, setDraft] = useState(EMPTY_PRODUCT)
  const fileRef = useRef(null)
  const rayonList = (rayons || []).slice(1)      // « Tout » n'est pas un rayon de rangement

  const open = (i) => {
    setEdit(i)
    setDraft(i === 'new' ? { ...EMPTY_PRODUCT } : { ...EMPTY_PRODUCT, ...products[i], price: products[i].price ?? '' })
  }
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => /^image\//.test(f.type))
    if (!files.length) return
    files.slice(0, MAX_PRO_PHOTOS).forEach((f) => {
      const rd = new FileReader()
      rd.onload = (ev) => setDraft((d) => (d.photos.length >= MAX_PRO_PHOTOS ? d : { ...d, photos: [...d.photos, ev.target.result] }))
      rd.readAsDataURL(f)
    })
  }
  // la 1re photo est celle qui s'affiche partout : on peut la choisir sans tout refaire
  const movePhoto = (k, dir) => setDraft((d) => {
    const p = [...d.photos], j = k + dir
    if (j < 0 || j >= p.length) return d
    ;[p[k], p[j]] = [p[j], p[k]]
    return { ...d, photos: p }
  })

  const priceNum = contact ? null : parseFloat(String(draft.price).replace(',', '.'))
  const valid = draft.title.trim() && (contact || priceNum > 0)

  const commit = () => {
    if (!valid) return
    const p = { ...draft, title: draft.title.trim(), price: contact ? null : priceNum }
    setProducts(edit === 'new' ? [...products, p] : products.map((x, i) => (i === edit ? p : x)))
    setEdit(null); setDraft(EMPTY_PRODUCT)
  }
  const remove = (i) => { setProducts(products.filter((_, j) => j !== i)); setEdit(null) }
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= products.length) return
    const next = [...products]
    ;[next[i], next[j]] = [next[j], next[i]]
    setProducts(next)
  }

  const word = contact ? 'prestation' : 'produit'

  return (
    <>
      <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Étape 5</p>
      <h1 className="font-title text-xl font-bold text-nout-texte mb-1">{contact ? 'Tes prestations' : 'Tes produits'}</h1>
      <p className="text-[13px] text-gray-500 mb-4">
        {contact ? 'Liste tes prestations — les clients demandent un devis via la messagerie NOUT.'
          : "Remplis ta boutique carte par carte — chaque produit apparaît en direct dans l'aperçu. Laisse vide : on met des exemples."}
      </p>

      {/* ── formulaire d'édition (ajout ou modification) ── */}
      {edit !== null && (
        <div className="border border-gray-200 rounded-xl p-3 mb-4">
          <p className="text-[13px] font-bold text-nout-texte mb-2">
            {edit === 'new' ? `Nouveau ${word}` : `Modifier « ${products[edit]?.title} »`}
          </p>

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                 onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
          <div className="flex gap-1.5 flex-wrap mb-2.5">
            {draft.photos.map((p, k) => (
              <span key={k} className="relative w-16 h-20 rounded-lg overflow-hidden border border-gray-200 group/ph">
                <img src={p} alt="" className="w-full h-full object-cover" />
                {k === 0 && <span className="absolute inset-x-0 top-0 bg-nout-turquoise text-white text-[8px] text-center font-bold leading-tight py-0.5">Principale</span>}
                <span className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover/ph:opacity-100 bg-black/60">
                  <button type="button" aria-label="Reculer la photo" onClick={() => movePhoto(k, -1)} className="flex-1 text-white text-[11px] leading-5">‹</button>
                  <button type="button" aria-label="Retirer la photo" onClick={() => set('photos', draft.photos.filter((_, j) => j !== k))} className="flex-1 text-white text-[11px] leading-5">×</button>
                  <button type="button" aria-label="Avancer la photo" onClick={() => movePhoto(k, 1)} className="flex-1 text-white text-[11px] leading-5">›</button>
                </span>
              </span>
            ))}
            {draft.photos.length < MAX_PRO_PHOTOS && (
              <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-16 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-nout-turquoise text-[10.5px] font-semibold text-gray-400 leading-tight">
                Photos<br /><span className="font-normal">{draft.photos.length}/{MAX_PRO_PHOTOS}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <input className="input-field !py-2 !text-[13px]" placeholder={contact ? 'Nom de la prestation' : 'Titre du produit'}
                   value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={60} />
            {!contact && (
              <input className="input-field !py-2 !text-[13px]" placeholder="Prix € (ce que tu reçois)" inputMode="decimal"
                     value={draft.price} onChange={(e) => set('price', e.target.value)} />
            )}
            <textarea className="input-field resize-none min-h-[64px] !text-[13px]" maxLength={600}
                      placeholder={contact ? 'Ce que comprend la prestation, la durée, la zone…' : 'Matière, dimensions, entretien, ce qui rend ce produit unique…'}
                      value={draft.description} onChange={(e) => set('description', e.target.value)} />
            <div className="flex gap-1.5 flex-wrap">
              {rayonList.length > 0 && (
                <select className="input-field !py-2 !text-[13px] flex-1 min-w-[130px]" value={draft.rayon}
                        onChange={(e) => set('rayon', e.target.value)} aria-label="Rayon">
                  <option value="">Rayon : automatique</option>
                  {rayonList.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              {!contact && (
                <select className="input-field !py-2 !text-[13px] flex-1 min-w-[130px]" value={draft.condition}
                        onChange={(e) => set('condition', e.target.value)} aria-label="État du produit">
                  <option value="neuf">Produit neuf</option>
                  <option value="occasion">Produit d'occasion</option>
                </select>
              )}
            </div>
            {!contact && (
              <p className="text-[11px] text-gray-400 leading-relaxed">
                L'état choisi commande l'encadré légal des garanties affiché sur la fiche : la présomption
                de défaut couvre 24 mois pour un produit neuf, 12 mois pour un produit d'occasion.
              </p>
            )}
            <div className="flex gap-1.5 items-center">
              <button type="button" onClick={commit} disabled={!valid}
                      className="btn-primary flex-1 !py-2 !text-[12.5px] disabled:opacity-40 disabled:cursor-not-allowed">
                {edit === 'new' ? 'Ajouter' : 'Enregistrer'}
              </button>
              {edit !== 'new' && (
                <button type="button" onClick={() => remove(edit)} className="text-[12px] font-semibold text-red-600 px-2">Supprimer</button>
              )}
              <button type="button" onClick={() => { setEdit(null); setDraft(EMPTY_PRODUCT) }}
                      className="text-[12px] font-semibold text-gray-400 px-2">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── grille des produits ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {edit !== 'new' && (
          <button type="button" onClick={() => open('new')}
                  className="rounded-xl border-2 border-dashed border-gray-300 hover:border-nout-turquoise hover:bg-[#EAF5F3] min-h-[180px] flex flex-col items-center justify-center gap-1 text-[13px] font-semibold text-gray-500">
            <span className="text-2xl font-light text-nout-turquoise">+</span>
            Ajouter {contact ? 'une prestation' : 'un produit'}
          </button>
        )}
        {products.map((p, i) => (
          <div key={i} className={`rounded-xl border overflow-hidden relative group/card ${edit === i ? 'border-nout-turquoise ring-2 ring-nout-turquoise/20' : 'border-gray-200'}`}>
            <div className="aspect-[3/4] bg-gray-100 relative">
              <img src={p.photos?.[0] || stockImg(sector || 'Autre', i)} alt="" className="w-full h-full object-cover" />
              {p.photos?.length > 1 && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/55 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {p.photos.length} photos
                </span>
              )}
              {/* réordonner : l'ordre de la grille est l'ordre de la boutique */}
              <span className="absolute inset-x-0 top-0 flex justify-between p-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <button type="button" aria-label="Déplacer vers la gauche" disabled={i === 0} onClick={() => move(i, -1)}
                        className="w-6 h-6 rounded-full bg-black/55 text-white text-[13px] leading-none disabled:opacity-30">‹</button>
                <button type="button" aria-label="Déplacer vers la droite" disabled={i === products.length - 1} onClick={() => move(i, 1)}
                        className="w-6 h-6 rounded-full bg-black/55 text-white text-[13px] leading-none disabled:opacity-30">›</button>
              </span>
              <button type="button" onClick={() => open(i)}
                      className="absolute inset-x-0 bottom-0 py-1.5 bg-black/60 text-white text-[11.5px] font-semibold opacity-0 group-hover/card:opacity-100 transition-opacity">
                Modifier
              </button>
            </div>
            <div className="p-2">
              <p className="text-[12.5px] font-semibold text-nout-texte truncate">{p.title}</p>
              <p className="text-[13px] font-bold text-nout-texte">{contact ? 'Sur devis' : formatEuro(p.price)}</p>
              {p.rayon && <p className="text-[10.5px] text-gray-400 truncate">{p.rayon}</p>}
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

// ─── « Personnaliser » : l'éditeur complet de la boutique ──────────────────────────
// Quatre volets : Textes (tout est réécrivable), Images (où va la photo + laquelle),
// Sections (ordre, affichage, avant/après la grille), Style (couleur, police, thème).
// Tout tape dans le même état que l'aperçu à droite → chaque changement est visible
// immédiatement. Aucune base touchée : la sauvegarde viendra avec la table `shops`.

const TABS = [['textes', 'Textes'], ['images', 'Images'], ['sections', 'Sections'], ['style', 'Style']]

// Mises en page d'accueil : où se place la grande image
const HERO_LAYS = [
  ['hero', 'Image en fond', 'Photo plein cadre, texte par-dessus'],
  ['minimal', 'Image à droite', 'Texte à gauche, photo à côté'],
  ['splitL', 'Image à gauche', 'Photo à gauche, texte à droite'],
  ['band', 'Bandeau photo', 'Photo pleine largeur, texte dessous'],
  ['market', 'Photo ronde', 'Vignette ronde à côté du texte'],
  ['modern', 'Bandeau sombre', 'Bloc foncé, sans photo'],
  ['soft', 'Sans image', 'Texte seul, teinté, très sobre'],
]

// Champs de texte : [clé, libellé, aide, taille max, multiligne]
const TEXT_FIELDS = (contact) => [
  ['announce', "Barre d'annonce", 'La bande de couleur tout en haut', 90, false],
  ['tagline', 'Accroche (grand titre)', "La phrase d'accueil de ta boutique", 120, true],
  ['description', 'Texte sous l\'accroche', 'Deux lignes pour te présenter', 220, true],
  ['cta', 'Bouton principal', contact ? 'Ex. Demander un devis' : 'Ex. Découvrir la collection', 28, false],
  ['bsTitle', 'Titre « best-sellers »', 'Ex. Nos coups de cœur', 40, false],
  ['reviewsTitle', 'Titre des avis', 'Ex. Ils nous font confiance', 40, false],
  ['aboutTitle', 'Titre « à propos »', contact ? "Ex. L'équipe" : "Ex. L'atelier", 40, false],
  ['aboutText', 'Texte « à propos »', 'Raconte ton histoire en quelques lignes', 320, true],
  ['howTitle', 'Titre « comment ça marche »', 'Ex. Commander en 3 étapes', 40, false],
]

// ── Couleurs : une vraie palette à explorer, pas 15 pastilles ──────────────────────
// 14 familles de teintes × 5 nuances, générées en HSL → le vendeur balaie tout le
// spectre sans quitter la page ; le sélecteur système et le code hexa restent
// disponibles pour ceux qui ont une charte de marque précise.
const HUES = [
  ['Rouge', 6], ['Orange', 24], ['Ambre', 38], ['Or', 48], ['Olive', 78], ['Vert', 138],
  ['Émeraude', 162], ['Teal', 176], ['Cyan', 192], ['Bleu', 214], ['Indigo', 236],
  ['Violet', 266], ['Magenta', 302], ['Rose', 338],
]
const SHADES = [[70, 34], [58, 44], [48, 54], [38, 58], [26, 46]]   // [luminosité, saturation]
const NEUTRALS = ['#111820', '#37415C', '#6B7280', '#A8A29E', '#C8BFB2', '#EDE9E3']

function hsl2hex(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const to = (v) => Math.round(255 * v).toString(16).padStart(2, '0')
  return '#' + to(f(0)) + to(f(8)) + to(f(4))
}
function hex2hsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return null
  const [r, g, b] = m.slice(1).map((v) => parseInt(v, 16) / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  const l = (mx + mn) / 2
  if (!d) return { h: 0, s: 0, l: l * 100 }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4)
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 }
}
// Accords calculés à partir de la couleur principale (ce qui « va avec »)
function harmonies(hex) {
  const c = hex2hsl(hex)
  if (!c) return []
  const s = Math.max(28, Math.min(c.s, 62))
  return [
    ['Plus foncée', hsl2hex(c.h, s + 6, Math.max(20, c.l - 20))],
    ['Voisine', hsl2hex((c.h + 32) % 360, s, c.l)],
    ['Opposée', hsl2hex((c.h + 180) % 360, s, Math.min(52, c.l + 4))],
    ['Neutre foncé', '#1F2933'],
  ]
}

function ColorField({ label, hint, value, onChange, suggestions, swatches, onReset }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="w-9 h-9 rounded-lg border border-black/10 flex-shrink-0" style={{ background: value }} />
        <div className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
          <span className="block text-[11.5px] text-gray-400">{hint}</span>
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="text-[12px] font-semibold text-nout-turquoise flex-shrink-0">
          {open ? 'Fermer' : 'Explorer'}
        </button>
      </div>

      {swatches?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {swatches.map((c) => (
            <button key={c} type="button" aria-label={`Couleur ${c}`} onClick={() => onChange(c)}
                    className={`w-7 h-7 rounded-lg border-2 ${value?.toLowerCase() === c.toLowerCase() ? 'border-nout-texte' : 'border-transparent'}`}
                    style={{ background: c }} />
          ))}
        </div>
      )}

      {suggestions?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {suggestions.map(([n, c]) => (
            <button key={n} type="button" onClick={() => onChange(c)} title={n}
                    className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-[11.5px] font-semibold
                      ${value === c ? 'border-nout-texte text-nout-texte' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />{n}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
               className="input-field !py-1.5 !text-[12.5px] !w-28 font-mono uppercase" maxLength={7} aria-label={`Code couleur ${label}`} />
        <label className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer relative border border-gray-200 flex-shrink-0"
               style={{ background: 'conic-gradient(#E4572E,#E8B93E,#4E9E5B,#0E8C82,#1A3A8F,#8B5CF6,#C86B8E,#E4572E)' }} title="Pipette">
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#0E8C82'}
                 onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        {onReset && <button type="button" onClick={onReset} className="text-[12px] font-semibold text-gray-400 hover:text-nout-texte">Réinitialiser</button>}
      </div>

      {open && (
        <div className="mt-2.5 border border-gray-100 rounded-xl p-2 max-h-64 overflow-y-auto">
          {HUES.map(([n, h]) => (
            <div key={n} className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">{n}</span>
              {SHADES.map(([l, s]) => {
                const c = hsl2hex(h, s, l)
                return <button key={l} type="button" aria-label={`${n} ${l}`} onClick={() => onChange(c)}
                               className={`flex-1 h-6 rounded-md border-2 ${value.toLowerCase() === c ? 'border-nout-texte' : 'border-transparent'}`}
                               style={{ background: c }} />
              })}
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">Neutres</span>
            {NEUTRALS.map((c) => (
              <button key={c} type="button" aria-label={`Neutre ${c}`} onClick={() => onChange(c)}
                      className={`flex-1 h-6 rounded-md border-2 ${value.toLowerCase() === c.toLowerCase() ? 'border-nout-texte' : 'border-transparent'}`}
                      style={{ background: c }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function readImage(file, cb) {
  if (!file || !/^image\//.test(file.type)) return
  const rd = new FileReader()
  rd.onload = (e) => cb(e.target.result)
  rd.readAsDataURL(file)
}

function PersoStep({ shop, sector, accent, setAccent, fontKey, setFontKey, theme, setTheme,
                     texts, setTexts, layout, setLayout, phrase, setPhrase,
                     heroIdx, setHeroIdx, heroCustom, setHeroCustom,
                     aboutImage, setAboutImage, heroLay, setHeroLay,
                     accent2, setAccent2, bgTone, setBgTone, onDone }) {
  const [tab, setTab] = useState('textes')
  const [allFonts, setAllFonts] = useState(false)
  const heroRef = useRef(null)
  const aboutRef = useRef(null)
  const contact = shop.mode === 'contact'
  const sec = sector || 'Autre'
  const curLay = heroLay || LAYS[theme?.id] || 'minimal'

  const setT = (k, v) => setTexts({ ...texts, [k]: v })
  // l'accroche vit dans son propre état (elle sert dès l'étape 4) — on la route à part
  const val = (k) => (k === 'tagline' ? phrase : texts[k] || '')
  const put = (k, v) => (k === 'tagline' ? setPhrase(v) : setT(k, v))

  // Ordre des sections. Invariant : les blocs « avant la grille » sont en tête du tableau.
  // Descendre le dernier bloc d'avant (ou monter le premier d'après) fait traverser la grille.
  const firstAfter = layout.findIndex((b) => b.pos === 'after')
  const gridAt = firstAfter < 0 ? layout.length : firstAfter
  const move = (i, dir) => {
    const next = layout.map((b) => ({ ...b }))
    const j = i + dir
    if (dir === 1 && i === gridAt - 1) { next[i].pos = 'after'; setLayout(next); return }
    if (dir === -1 && i === gridAt) { next[i].pos = 'before'; setLayout(next); return }
    if (j < 0 || j >= next.length) return
    const tmp = next[i]; next[i] = next[j]; next[j] = tmp
    setLayout(next)
  }
  const toggle = (i) => setLayout(layout.map((b, k) => (k === i ? { ...b, on: !b.on } : b)))

  const recoFonts = FONT_CONTEXTS[sec] || FONT_CONTEXTS.Autre
  const fontList = allFonts ? Object.keys(FONTS) : [...new Set([...recoFonts, fontKey])]

  const Row = ({ children }) => <div className="border-t border-gray-100 pt-3 mt-3">{children}</div>
  const Lab = ({ children, hint }) => (
    <label className="block mb-1.5">
      <span className="block text-[10.5px] font-bold uppercase tracking-wide text-gray-400">{children}</span>
      {hint && <span className="block text-[11.5px] text-gray-400 font-normal mt-0.5">{hint}</span>}
    </label>
  )

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-nout-turquoise mb-1">Personnaliser</p>
          <h1 className="font-title text-xl font-bold text-nout-texte">Ta boutique, à ta main</h1>
        </div>
        <button type="button" onClick={onDone} className="btn-primary !py-2 !px-4 !text-[12.5px] flex-shrink-0">Terminer</button>
      </div>
      <p className="text-[13px] text-gray-500 mb-4">Chaque changement apparaît tout de suite dans l'aperçu.</p>

      <div className="flex gap-1 p-1 bg-gray-50 rounded-xl mb-4">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
                  className={`flex-1 py-2 rounded-lg text-[12.5px] font-semibold transition-colors
                    ${tab === k ? 'bg-white text-nout-texte shadow-sm' : 'text-gray-500 hover:text-nout-texte'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── TEXTES ── */}
      {tab === 'textes' && (
        <div className="flex flex-col gap-3">
          {TEXT_FIELDS(contact).map(([k, label, hint, max, multi]) => (
            <div key={k}>
              <Lab hint={hint}>{label}</Lab>
              {multi ? (
                <textarea className="input-field resize-none min-h-[70px] !text-[13px]" maxLength={max}
                          value={val(k)} onChange={(e) => put(k, e.target.value)} placeholder="Laisse vide : on garde le texte généré" />
              ) : (
                <input className="input-field !py-2 !text-[13px]" maxLength={max}
                       value={val(k)} onChange={(e) => put(k, e.target.value)} placeholder="Laisse vide : on garde le texte généré" />
              )}
            </div>
          ))}
          <button type="button" onClick={() => { setTexts({}); setPhrase('') }}
                  className="text-[12.5px] font-semibold text-gray-400 hover:text-nout-texte self-start mt-1">
            Revenir aux textes générés
          </button>
        </div>
      )}

      {/* ── IMAGES ── */}
      {tab === 'images' && (
        <div>
          {curLay === 'bio' ? (
            <p className="text-[12.5px] text-gray-500 leading-relaxed mb-3 px-3 py-2.5 bg-gray-50 rounded-lg">
              Le thème « lien en bio » a une seule mise en page : ta photo en rond, puis tes liens.
              Choisis un autre thème dans l'onglet Style pour disposer les images librement.
            </p>
          ) : (<>
          <Lab hint="Où se place ta grande photo sur la page d'accueil">Mise en page de l'accueil</Lab>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HERO_LAYS.map(([k, l, d]) => (
              <button key={k} type="button" onClick={() => setHeroLay(k)}
                      className={`text-left rounded-xl border p-2.5 transition-colors
                        ${curLay === k ? 'border-nout-turquoise bg-[#EAF5F3]' : 'border-gray-200 hover:border-gray-300'}`}>
                <HeroSchema kind={k} />
                <p className="text-[12px] font-semibold text-nout-texte mt-1.5">{l}</p>
                <p className="text-[10.5px] text-gray-400 leading-snug">{d}</p>
              </button>
            ))}
          </div>
          </>)}

          <Row>
            <Lab hint="Choisis dans la banque d'images libres de droits, ou mets la tienne">Photo d'accueil</Lab>
            <input ref={heroRef} type="file" accept="image/*" className="hidden"
                   onChange={(e) => { readImage(e.target.files[0], setHeroCustom); e.target.value = '' }} />
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: heroCount(sec) }, (_, i) => (
                <button key={i} type="button" onClick={() => { setHeroIdx(i); setHeroCustom(null) }}
                        className={`w-20 h-14 rounded-lg overflow-hidden border-2 ${!heroCustom && heroIdx === i ? 'border-nout-turquoise' : 'border-transparent'}`}>
                  <img src={heroImg(sec, i)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              <button type="button" onClick={() => heroRef.current?.click()}
                      className={`w-20 h-14 rounded-lg border-2 border-dashed text-[11px] font-semibold overflow-hidden
                        ${heroCustom ? 'border-nout-turquoise' : 'border-gray-300 text-gray-400 hover:border-nout-turquoise'}`}>
                {heroCustom ? <img src={heroCustom} alt="" className="w-full h-full object-cover" /> : 'Ma photo'}
              </button>
            </div>
            {heroCustom && (
              <button type="button" onClick={() => setHeroCustom(null)} className="text-[12px] font-semibold text-gray-400 mt-1.5">Retirer ma photo</button>
            )}
          </Row>

          <Row>
            <Lab hint="La photo à côté de ton texte de présentation">Photo « à propos »</Lab>
            <input ref={aboutRef} type="file" accept="image/*" className="hidden"
                   onChange={(e) => { readImage(e.target.files[0], setAboutImage); e.target.value = '' }} />
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 6 }, (_, i) => {
                const src = stockImg(sec, i)
                return (
                  <button key={i} type="button" onClick={() => setAboutImage(src)}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${aboutImage === src ? 'border-nout-turquoise' : 'border-transparent'}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                )
              })}
              <button type="button" onClick={() => aboutRef.current?.click()}
                      className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 text-[10.5px] font-semibold text-gray-400 hover:border-nout-turquoise">
                Ma photo
              </button>
            </div>
          </Row>
          <p className="text-[11.5px] text-gray-400 leading-relaxed mt-3">
            Les photos de tes produits se règlent dans « Produits » — jusqu'à {MAX_PRO_PHOTOS} par fiche.
          </p>
        </div>
      )}

      {/* ── SECTIONS ── */}
      {tab === 'sections' && (
        <div>
          <Lab hint="Monte, descends ou masque tes blocs. La grille de produits reste au centre.">Ordre de la page</Lab>
          <div className="flex flex-col">
            {layout.map((b, i) => (
              <div key={b.id}>
                {i === gridAt && <GridDivider />}
                <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 mb-1.5 ${b.on ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}
                            className="w-6 h-5 rounded border border-gray-200 text-gray-500 disabled:opacity-30 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button type="button" aria-label="Descendre" disabled={i === layout.length - 1} onClick={() => move(i, 1)}
                            className="w-6 h-5 rounded border border-gray-200 text-gray-500 disabled:opacity-30 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                  <span className={`flex-1 text-[13px] font-semibold ${b.on ? 'text-nout-texte' : 'text-gray-400'}`}>{b.label}</span>
                  <button type="button" onClick={() => toggle(i)}
                          className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border
                            ${b.on ? 'border-[#0E8C82] text-[#0B716A] bg-[#EAF5F3]' : 'border-gray-200 text-gray-400'}`}>
                    {b.on ? 'Affiché' : 'Masqué'}
                  </button>
                </div>
              </div>
            ))}
            {gridAt === layout.length && <GridDivider />}
          </div>
          <p className="text-[11.5px] text-gray-400 leading-relaxed mt-3">
            Tes pages légales (CGV, retours, mentions, confidentialité) et le pied de page restent toujours en bas :
            ils sont obligatoires pour vendre.
          </p>
        </div>
      )}

      {/* ── STYLE ── */}
      {tab === 'style' && (
        <div>
          <ColorField label="Couleur principale" hint="Boutons, prix, liens"
                      value={accent} onChange={setAccent} swatches={PALETTE} />

          <Row>
            <ColorField label="Couleur secondaire" hint="Barre d'annonce, pastilles, étapes"
                        value={accent2 || accent} onChange={setAccent2}
                        suggestions={harmonies(accent)}
                        onReset={accent2 ? () => setAccent2(null) : null} />
          </Row>

          <Row>
            <Lab hint="La teinte de la page derrière tes produits">Fond de la boutique</Lab>
            <div className="grid grid-cols-5 gap-2">
              {[['blanc', 'Blanc'], ['creme', 'Crème'], ['sable', 'Sable'], ['gris', 'Gris clair'], ['sombre', 'Sombre']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setBgTone(k)}
                        className={`rounded-xl border p-1.5 ${bgTone === k ? 'border-nout-turquoise ring-2 ring-nout-turquoise/20' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="block h-8 rounded-md border border-black/5" style={{ background: TONES[k] }} />
                  <span className="block text-[10.5px] font-semibold text-gray-500 mt-1">{l}</span>
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-gray-400 mt-2 leading-relaxed">
              Le fond sombre bascule automatiquement tous les textes en clair — la lisibilité reste garantie.
            </p>
          </Row>

          <Row>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Police des titres</span>
              <button type="button" onClick={() => setAllFonts(!allFonts)} className="text-[12px] font-semibold text-nout-turquoise">
                {allFonts ? 'Voir les conseillées' : `Toutes (${Object.keys(FONTS).length})`}
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
              {fontList.map((k) => (
                <button key={k} type="button" onClick={() => setFontKey(k)}
                        className={`rounded-xl border px-2 py-2.5 text-center ${fontKey === k ? 'border-nout-turquoise bg-[#EAF5F3]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="block text-[19px] leading-none text-nout-texte" style={{ fontFamily: FONTS[k].fam }}>Ag</span>
                  <span className="block text-[10px] font-semibold text-gray-500 mt-1">{FONTS[k].label}</span>
                </button>
              ))}
            </div>
          </Row>

          <Row>
            <Lab hint="Changer de thème garde tes textes et tes photos">Thème</Lab>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTheme(t)}
                        className={`text-left rounded-xl border p-2.5 ${theme?.id === t.id ? 'border-nout-turquoise ring-2 ring-nout-turquoise/20' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="block w-6 h-6 rounded-md mb-1.5" style={{ background: t.acc }} />
                  <p className="text-[12.5px] font-bold text-nout-texte">{t.name}</p>
                  <p className="text-[10.5px] text-gray-400 leading-snug">{t.vibe}</p>
                </button>
              ))}
            </div>
          </Row>
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <button type="button" onClick={onDone} className="btn-secondary flex-1">Retour au récapitulatif</button>
        <Link to="/boutique-templates" className="btn-secondary flex-1 text-center">Changer de template</Link>
      </div>
    </>
  )
}

// ─── SIRET : demandé à la PUBLICATION, jamais pour créer ────────────────────────────
// Créer et personnaliser sa boutique n'est pas un acte de commerce : aucune raison
// d'exiger un numéro d'entreprise à ce moment-là. En revanche, dès qu'on vend ce qu'on
// fabrique de façon habituelle, l'activité est professionnelle au sens de la loi, et
// NOUT doit collecter le numéro d'immatriculation du vendeur (règlement européen sur
// les services numériques, traçabilité des professionnels). D'où : porte ouverte pour
// créer, vérification au moment de publier, et un coup de main pour l'obtenir.
function SiretNotice() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl p-3.5 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-nout-texte">Avant de publier : ton numéro SIRET</p>
          <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">
            Tu peux créer et personnaliser ta boutique librement. Le SIRET n'est demandé qu'au moment
            de la rendre publique.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="text-[12px] font-semibold text-nout-turquoise flex-shrink-0">
          {open ? 'Fermer' : 'Je n\'en ai pas'}
        </button>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3">
          <div>
            <p className="text-[12.5px] font-semibold text-nout-texte">Tu fabriques ou tu achètes pour revendre</p>
            <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">
              Bijoux, savons, gâteaux, meubles, prestations… Dès que c'est régulier, la loi considère
              que c'est une activité professionnelle, quel que soit le montant. L'immatriculation en
              micro-entreprise se fait en ligne sur le guichet unique des entreprises : c'est gratuit,
              ça prend une quinzaine de minutes, et les cotisations sont proportionnelles à ce que tu
              vends. Une fois le numéro reçu, ta boutique se publie.
            </p>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold text-nout-texte">Tu vends seulement tes affaires personnelles</p>
            <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">
              Là, aucun SIRET n'est nécessaire — et tu n'as pas besoin d'une boutique Pro :
              ton compte NOUT classique te permet déjà de vendre, avec le même paiement protégé
              et la même livraison 974.
            </p>
          </div>
          <p className="text-[11.5px] text-gray-400 leading-relaxed">
            NOUT ne peut pas se substituer à ton conseil : en cas de doute sur ton statut,
            rapproche-toi de la Chambre de métiers ou de la CCI de La Réunion.
          </p>
        </div>
      )}
    </div>
  )
}

function GridDivider() {
  return (
    <div className="flex items-center gap-2 my-1.5">
      <span className="flex-1 h-px bg-gray-200" />
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Grille de tes produits</span>
      <span className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

// Petit schéma qui montre OÙ tombe l'image dans chaque mise en page
function HeroSchema({ kind }) {
  const box = 'rounded-[3px] bg-nout-turquoise/70'
  const txt = 'rounded-[2px] bg-gray-300'
  return (
    <div className="h-11 rounded-md bg-gray-50 border border-gray-100 p-1.5 flex gap-1">
      {kind === 'hero' && <div className={`${box} flex-1 flex flex-col justify-end p-1 gap-0.5`}><span className="h-1 w-2/3 rounded-[2px] bg-white/85" /><span className="h-0.5 w-1/2 rounded-[2px] bg-white/60" /></div>}
      {kind === 'minimal' && <><div className="flex-1 flex flex-col justify-center gap-1"><span className={`${txt} h-1 w-4/5`} /><span className={`${txt} h-0.5 w-3/5`} /></div><div className={`${box} w-2/5`} /></>}
      {kind === 'splitL' && <><div className={`${box} w-2/5`} /><div className="flex-1 flex flex-col justify-center gap-1"><span className={`${txt} h-1 w-4/5`} /><span className={`${txt} h-0.5 w-3/5`} /></div></>}
      {kind === 'band' && <div className="flex-1 flex flex-col gap-1"><span className={`${box} h-4 w-full`} /><span className={`${txt} h-1 w-2/3`} /><span className={`${txt} h-0.5 w-1/2`} /></div>}
      {kind === 'market' && <><div className="flex-1 flex flex-col justify-center gap-1"><span className={`${txt} h-1 w-4/5`} /><span className={`${txt} h-0.5 w-3/5`} /></div><span className={`${box} w-7 h-7 !rounded-full self-center`} /></>}
      {kind === 'modern' && <div className="flex-1 rounded-[3px] bg-[#131A22] flex flex-col justify-center px-1.5 gap-1"><span className="h-1 w-2/3 rounded-[2px] bg-white/80" /><span className="h-0.5 w-1/2 rounded-[2px] bg-white/45" /></div>}
      {kind === 'soft' && <div className="flex-1 rounded-[3px] bg-nout-turquoise/10 flex flex-col justify-center items-center gap-1"><span className={`${txt} h-1 w-2/3`} /><span className={`${txt} h-0.5 w-1/2`} /></div>}
    </div>
  )
}

function formatEuro(n) {
  return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €'
}
