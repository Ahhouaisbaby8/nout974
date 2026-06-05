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
      <section className="bg-nout-hero min-h-[420px] flex items-center px-4 py-16">
        <div className="max-w-3xl mx-auto w-full text-center">

          <h1 className="font-title font-extrabold text-[42px] sm:text-[52px] leading-[1.08] text-white mb-4 tracking-tight">
            Nout Dressing.<br />
            Nout Maison.<br />
            <span className="text-nout-turquoise">Nout 974.</span>
          </h1>

          <p className="text-[18px] text-white/75 mb-10 font-light">
            La marketplace de La Réunion
          </p>

          {/* Barre de recherche pill */}
          <form
            onSubmit={handleSearch}
            className="flex items-center bg-white rounded-full shadow-2xl px-2 py-2 gap-1 max-w-2xl mx-auto"
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
              className="flex-shrink-0 bg-nout-turquoise text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
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

      {/* ── D) SECTION PRIX ──────────────────────────────────────── */}
      <PriceRangeSection />

      {/* ── C) ANNONCES RÉCENTES ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-14">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-title font-bold text-[22px] text-nout-texte">
            Nouvelles annonces
          </h2>
          <button
            onClick={() => navigate('/recherche')}
            className="text-nout-turquoise text-sm font-semibold hover:underline"
          >
            Voir tout →
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
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
