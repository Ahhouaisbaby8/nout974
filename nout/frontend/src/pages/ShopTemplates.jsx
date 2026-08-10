import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ShopPage from './ShopPage'
import { DEMOS, TPL_ORDER, TPL_CATS, TPL_MORE, themeById, SECTOR_LABEL, demoShop, demoListings, loadProFonts, modeOf } from './pro/proData'

// ─── NOUT Pro : GALERIE DE TEMPLATES (DEV ONLY — /boutique-templates) ───────────────
// Façon Horizons : chaque vignette est une VRAIE mini-boutique rendue (ShopPage à
// l'échelle), filtres par mots-clés, bouton « Aperçu » plein écran + « Utiliser ce
// template » qui lance le wizard pré-rempli. Données 100 % fictives, aucune base.

const THUMB_W = 760   // largeur de rendu de la boutique avant réduction

function Thumb({ demo }) {
  // La boutique est rendue en 760 px puis réduite à la largeur RÉELLE de la carte.
  // L'échelle doit être mesurée (et re-mesurée au redimensionnement) : une valeur figée
  // laissait une bande blanche à droite dès que la carte n'avait pas la largeur prévue.
  const boxRef = useRef(null)
  const [scale, setScale] = useState(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => { const w = el.clientWidth; if (w) setScale(w / THUMB_W) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={boxRef} className="relative h-[240px] overflow-hidden border-b border-gray-100 bg-white">
      <div className="origin-top-left pointer-events-none"
           style={{ width: THUMB_W, transform: `scale(${scale ?? 0.462})`, visibility: scale ? 'visible' : 'hidden' }}>
        <ShopPage shop={demoShop(demo)} listings={demoListings(demo)} />
      </div>
    </div>
  )
}

export default function ShopTemplates() {
  const navigate = useNavigate()
  const [sel, setSel] = useState(TPL_CATS[0])
  const [moreOpen, setMoreOpen] = useState(false)
  const [preview, setPreview] = useState(null)   // id de démo en aperçu plein écran
  // l'aperçu s'ouvre dans le format de l'appareil réellement utilisé (pas toujours mobile)
  const [device, setDevice] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 900 ? 'desktop' : 'mobile'))

  useEffect(() => { loadProFonts() }, [])
  useEffect(() => {
    const close = () => setMoreOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setPreview(null) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [])

  const list = useMemo(() => {
    const all = TPL_ORDER.map((id) => ({ id, d: DEMOS[id] }))
    if (sel.mode) return all.filter(({ id }) => modeOf(id) === sel.mode)
    if (!sel.v) return all
    return all.filter(({ d }) => sel.v.includes(d.sector))
  }, [sel])

  const use = (id) => navigate('/boutique-creer', { state: { template: id } })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <title>Templates — NOUT Pro</title>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <span className="font-title font-extrabold text-lg text-nout-texte">NOUT</span>
          <span className="w-px h-4 bg-gray-300" />
          <span className="font-title text-[13px] font-semibold text-gray-500">Pro</span>
        </div>
        <h1 className="font-title text-[22px] font-bold text-nout-texte">Commence avec un template</h1>
        <p className="text-[13px] text-gray-500 mt-1">De vraies boutiques d'exemple — aperçu, puis personnalise tout.</p>
        <p className="inline-block mt-3 text-[11.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
          Aperçu — NOUT Pro ouvre bientôt aux entreprises (SIRET requis)
        </p>
      </div>

      {/* filtres (mots-clés validés) */}
      <div className="flex gap-2 justify-center flex-wrap mb-6">
        {TPL_CATS.map((c) => (
          <button key={c.l} type="button" onClick={() => setSel(c)}
                  className={`px-3.5 py-1.5 text-[12.5px] rounded-full border transition-colors
                    ${sel.l === c.l ? 'bg-nout-texte text-white border-nout-texte font-semibold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            {c.l}
          </button>
        ))}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setMoreOpen(!moreOpen)}
                  className={`px-3.5 py-1.5 text-[12.5px] rounded-full border flex items-center gap-1
                    ${TPL_MORE.some((m) => m.l === sel.l) ? 'bg-nout-texte text-white border-nout-texte font-semibold' : 'bg-white text-gray-500 border-gray-200'}`}>
            {TPL_MORE.some((m) => m.l === sel.l) ? sel.l : 'Plus'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {moreOpen && (
            <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-30 min-w-[190px]">
              {TPL_MORE.map((m) => (
                <button key={m.l} type="button" onClick={() => { setSel(m); setMoreOpen(false) }}
                        className="block w-full text-left px-3 py-2 text-[13px] font-medium text-nout-texte rounded-lg hover:bg-gray-50">
                  {m.l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* grille de vignettes riches */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map(({ id, d }) => (
          <div key={id} role="button" tabIndex={0}
               onClick={() => setPreview(id)}
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreview(id) } }}
               className="group text-left bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="relative">
              <Thumb demo={d} />
              <div className="absolute inset-0 bg-nout-texte/0 group-hover:bg-nout-texte/35 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <span className="bg-white text-nout-texte text-[12.5px] font-bold px-4 py-2 rounded-full shadow">Aperçu</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); use(id) }}
                        className="bg-nout-turquoise text-white text-[12.5px] font-bold px-4 py-2 rounded-full shadow">
                  Utiliser ce template
                </button>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="font-title text-[13px] font-bold text-nout-texte">{d.brand}</p>
              <p className="text-[11px] text-gray-400">Thème {themeById(d.template).name} · {SECTOR_LABEL[d.sector] || d.sector}</p>
            </div>
          </div>
        ))}
      </div>

      {/* aperçu plein écran (façon Horizons) — largeur adaptée à l'écran, basculable */}
      {preview && DEMOS[preview] && (
        <div className="fixed inset-0 z-[200] bg-gray-100 flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-gray-200">
            <p className="text-[12.5px] font-bold text-nout-texte truncate">
              Aperçu du template — {DEMOS[preview].brand} · thème {themeById(DEMOS[preview].template).name}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* bascule ordinateur / mobile (par défaut : l'appareil réellement utilisé) */}
              <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {[['desktop', 'Ordinateur'], ['mobile', 'Mobile']].map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setDevice(k)}
                          className={`px-2.5 py-1 text-[11.5px] font-semibold rounded-md transition-colors ${
                            device === k ? 'bg-white text-nout-texte shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setPreview(null)}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-nout-texte hover:bg-gray-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          {/* en mode ordinateur, le cadre prend TOUTE la largeur (comme un vrai navigateur) :
              c'est le site lui-même qui centre son contenu, via la prop `wide` de ShopPage */}
          <div className={`flex-1 overflow-y-auto pb-24 ${device === 'mobile' ? 'px-3 py-5' : ''}`}>
            <div className={`mx-auto bg-white overflow-hidden transition-all ${
              device === 'mobile' ? 'max-w-[430px] rounded-2xl shadow-2xl' : 'w-full'}`}>
              <ShopPage shop={demoShop(DEMOS[preview])} listings={demoListings(DEMOS[preview])}
                        wide={device === 'desktop'} />
            </div>
          </div>
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-nout-texte text-white rounded-full pl-4 pr-1.5 py-1.5 shadow-2xl z-[210] text-[12px] whitespace-nowrap">
            <span>Propulsé par <b className="text-nout-turquoise">NOUT</b></span>
            <button type="button" onClick={() => use(preview)}
                    className="bg-nout-turquoise text-white text-[12.5px] font-bold px-4 py-2 rounded-full">
              Utiliser ce template
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
