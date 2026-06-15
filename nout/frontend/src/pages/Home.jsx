import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../utils/categories'
import { REUNION_CITIES_WITH_ALL } from '../utils/cities'
import { getListings } from '../services/listings'
import { getFavoriteIds } from '../services/favorites'
import ListingCard from '../components/ui/ListingCard'
import PriceRangeSection from '../components/PriceRangeSection'
import Spinner from '../components/ui/Spinner'
import SkeletonCard from '../components/ui/SkeletonCard'

const HOW_IT_WORKS = [
  {
    title: 'Publie ton annonce',
    desc:  "Prends des photos, décris ton article, fixe ton prix — en 2 minutes c'est en ligne.",
  },
  {
    title: 'Reçois des messages',
    desc:  'Les acheteurs intéressés te contactent directement via la messagerie sécurisée.',
  },
  {
    title: 'Vends en sécurité',
    desc:  'Échangez et finalisez la vente. NOUT protège chaque transaction.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [search,   setSearch]   = useState('')
  const [city,     setCity]     = useState('Toute La Réunion')
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [favIds,   setFavIds]   = useState(new Set())

  useEffect(() => {
    getListings({ limit: 8 })
      .then(({ data }) => setListings(data ?? []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) { setFavIds(new Set()); return }
    getFavoriteIds(user.id).then(setFavIds).catch(() => {})
  }, [user?.id])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (city && city !== 'Toute La Réunion') params.set('ville', city)
    navigate(`/recherche?${params}`)
  }

  const handleCategory = (catId) => navigate(`/recherche?categorie=${catId}`)

  return (
    <div>

      {/* ── A) HERO ──────────────────────────────────────────────── */}
      <section className="hero-sunset relative overflow-hidden flex items-center px-4 py-12">

        {/* Lueur basse coucher de soleil */}
        <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
             style={{ background: 'linear-gradient(to top, rgba(255,120,60,0.18), transparent)' }} />

        {/* Étoiles / particules */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {[
            { top:'12%', left:'8%',  delay:'0s',    size:'w-1 h-1',     color:'bg-white' },
            { top:'22%', left:'18%', delay:'1.1s',  size:'w-1 h-1',     color:'bg-white' },
            { top:'9%',  left:'32%', delay:'0.6s',  size:'w-1.5 h-1.5', color:'bg-[#00C4B4]' },
            { top:'18%', left:'55%', delay:'1.8s',  size:'w-1 h-1',     color:'bg-white' },
            { top:'8%',  right:'28%',delay:'0.3s',  size:'w-1.5 h-1.5', color:'bg-white' },
            { top:'20%', right:'18%',delay:'1.4s',  size:'w-1 h-1',     color:'bg-[#00C4B4]' },
            { top:'30%', right:'10%',delay:'2.1s',  size:'w-1 h-1',     color:'bg-white' },
            { top:'6%',  left:'70%', delay:'0.9s',  size:'w-1 h-1',     color:'bg-white' },
          ].map((s, i) => (
            <div key={i}
              className={`absolute rounded-full twinkle ${s.size} ${s.color}`}
              style={{ top: s.top, left: s.left, right: s.right, animationDelay: s.delay }}
            />
          ))}
        </div>

        {/* 974 flottant en arrière-plan */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span
            className="font-title font-black text-white float-974"
            style={{ fontSize: 'clamp(140px, 32vw, 280px)', opacity: 0.055, letterSpacing: '0.1em', lineHeight: 1 }}
          >
            974
          </span>
        </div>

        {/* Palmier gauche */}
        <div className="absolute bottom-0 left-0 palm-left pointer-events-none select-none hidden sm:block">
          <svg width="170" height="300" viewBox="0 0 170 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M65 298 Q68 242 72 186 Q76 130 83 85 Q88 52 93 22"
                  stroke="rgba(4,2,0,0.52)" strokeWidth="13" strokeLinecap="round"/>
            <path d="M93 22 Q52 38 12 26"   stroke="rgba(4,2,0,0.48)" strokeWidth="8" strokeLinecap="round"/>
            <path d="M93 22 Q70 2 42 -8"    stroke="rgba(4,2,0,0.43)" strokeWidth="6" strokeLinecap="round"/>
            <path d="M93 22 Q132 36 165 27" stroke="rgba(4,2,0,0.48)" strokeWidth="8" strokeLinecap="round"/>
            <path d="M93 22 Q118 4 148 -4"  stroke="rgba(4,2,0,0.43)" strokeWidth="6" strokeLinecap="round"/>
            <path d="M93 22 Q91 0 88 -18"   stroke="rgba(4,2,0,0.4)"  strokeWidth="5" strokeLinecap="round"/>
            <path d="M93 22 Q62 48 34 58"   stroke="rgba(4,2,0,0.38)" strokeWidth="5" strokeLinecap="round"/>
            <path d="M93 22 Q124 48 152 56" stroke="rgba(4,2,0,0.38)" strokeWidth="5" strokeLinecap="round"/>
            <circle cx="93" cy="29" r="7"   fill="rgba(4,2,0,0.42)"/>
            <circle cx="101" cy="24" r="5"  fill="rgba(4,2,0,0.36)"/>
            <circle cx="85"  cy="25" r="5"  fill="rgba(4,2,0,0.36)"/>
          </svg>
        </div>

        {/* Palmier droit */}
        <div className="absolute bottom-0 right-0 palm-right pointer-events-none select-none hidden sm:block">
          <svg width="170" height="275" viewBox="0 0 170 275" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M105 273 Q102 218 98 163 Q94 108 88 68 Q84 42 78 16"
                  stroke="rgba(4,2,0,0.52)" strokeWidth="12" strokeLinecap="round"/>
            <path d="M78 16 Q118 30 158 20"  stroke="rgba(4,2,0,0.48)" strokeWidth="8" strokeLinecap="round"/>
            <path d="M78 16 Q104 -2 134 -10" stroke="rgba(4,2,0,0.43)" strokeWidth="6" strokeLinecap="round"/>
            <path d="M78 16 Q40 30 6 22"     stroke="rgba(4,2,0,0.48)" strokeWidth="8" strokeLinecap="round"/>
            <path d="M78 16 Q54 -1 26 -8"    stroke="rgba(4,2,0,0.43)" strokeWidth="6" strokeLinecap="round"/>
            <path d="M78 16 Q80 -4 83 -22"   stroke="rgba(4,2,0,0.4)"  strokeWidth="5" strokeLinecap="round"/>
            <path d="M78 16 Q110 42 138 52"  stroke="rgba(4,2,0,0.38)" strokeWidth="5" strokeLinecap="round"/>
            <path d="M78 16 Q48 42 20 54"    stroke="rgba(4,2,0,0.38)" strokeWidth="5" strokeLinecap="round"/>
            <circle cx="78" cy="23" r="7"    fill="rgba(4,2,0,0.42)"/>
            <circle cx="86" cy="18" r="5"    fill="rgba(4,2,0,0.36)"/>
            <circle cx="70" cy="19" r="5"    fill="rgba(4,2,0,0.36)"/>
          </svg>
        </div>

        {/* Contenu principal */}
        <div className="relative z-10 max-w-3xl mx-auto w-full text-center">

          <h1 className="hero-fade-up font-title font-extrabold text-[34px] sm:text-[48px] leading-[1.1] text-white mb-3 tracking-tight">
            NOUT<br />
            <span className="text-nout-turquoise">Marketplace de La Réunion</span>
          </h1>

          <p className="hero-fade-up-1 text-[16px] text-white/75 mb-8 font-light">
            La marketplace mode 100&nbsp;% réunionnaise, entre particuliers
          </p>

          {/* Barre de recherche pill */}
          <form
            onSubmit={handleSearch}
            className="hero-fade-up-2 flex items-center bg-white border border-gray-200 rounded-full shadow-2xl px-2 py-2 gap-1 max-w-2xl mx-auto"
          >
            <input
              type="text"
              placeholder="Que recherches-tu ?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2.5 outline-none text-nout-texte text-sm bg-transparent placeholder-gray-400"
            />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="hidden sm:block px-3 py-2.5 text-sm text-nout-muted bg-transparent outline-none border-l border-gray-200 cursor-pointer max-w-[160px]"
            >
              {REUNION_CITIES_WITH_ALL.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              className="flex-shrink-0 bg-nout-turquoise hover:bg-nout-dark-pri text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
            >
              Rechercher
            </button>
          </form>

        </div>
      </section>

      {/* ── B) CATÉGORIES ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-4">
        <h2 className="font-title font-bold text-[20px] text-nout-texte mb-4">
          Catégories
        </h2>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border border-nout-border bg-white text-nout-texte text-[13px] font-medium hover:bg-nout-turquoise hover:text-white hover:border-nout-turquoise transition-all duration-150 cursor-pointer"
            >
              <span className="text-base">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── C) NOUVEAUTÉS ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-10">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <h2 className="font-title font-bold text-[22px] text-nout-texte">Nouveautés</h2>
            <span className="bg-nout-turquoise text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">New</span>
          </div>
          <button
            onClick={() => navigate('/recherche')}
            className="text-[#007A6E] text-sm font-semibold hover:underline"
          >
            Voir tout →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-nout-muted">
            <p className="text-6xl mb-4">🏝️</p>
            <p className="text-lg font-title font-bold text-nout-texte">Aucune annonce pour le moment</p>
            <p className="text-sm mt-1">Sois le premier à publier !</p>
            <button
              onClick={() => navigate('/publier')}
              className="mt-6 px-8 py-3 bg-nout-accent text-white rounded-full font-semibold hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #0E7FAB 0%, #00C4B4 100%)' }}
            >
              Publier une annonce
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l} isFavorited={favIds.has(l.id)} />
            ))}
          </div>
        )}
      </section>

      {/* ── D) SECTION PRIX ──────────────────────────────────────── */}
      <PriceRangeSection />

      {/* ── E) COMMENT ÇA MARCHE ─────────────────────────────────── */}
      <section className="bg-nout-creme py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-title font-bold text-[24px] text-nout-texte text-center mb-12">
            Comment ça marche ?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ title, desc }, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-full bg-nout-roi text-white flex items-center justify-center font-title font-bold text-xl mx-auto mb-5 shadow-nout-md">
                  {i + 1}
                </div>
                <h3 className="font-title font-bold text-[17px] text-nout-texte mb-2">{title}</h3>
                <p className="text-nout-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/inscription')}
              className="px-10 py-3.5 text-white rounded-full font-semibold text-base hover:opacity-90 transition-opacity shadow-nout-md"
              style={{ background: 'linear-gradient(135deg, #0E7FAB 0%, #00C4B4 100%)' }}
            >
              Rejoindre NOUT gratuitement
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
