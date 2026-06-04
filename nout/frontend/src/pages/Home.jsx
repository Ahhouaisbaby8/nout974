import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../utils/categories'
import { REUNION_CITIES_WITH_ALL } from '../utils/cities'
import { getListings } from '../services/listings'
import ListingCard from '../components/ui/ListingCard'
import Spinner from '../components/ui/Spinner'

const HOW_IT_WORKS = [
  {
    icon: '📸',
    title: 'Publie ton annonce',
    desc: "Prends des photos, décris ton article, fixe ton prix — en 2 minutes c'est en ligne.",
  },
  {
    icon: '💬',
    title: 'Reçois des messages',
    desc: 'Les acheteurs intéressés te contactent directement via la messagerie sécurisée.',
  },
  {
    icon: '🤝',
    title: 'Vends en sécurité',
    desc: 'Échangez et finalisez la vente. NOUT protège chaque transaction.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('Toute La Réunion')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getListings({ limit: 8 })
      .then(({ data }) => setListings(data ?? []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (city && city !== 'Toute La Réunion') params.set('ville', city)
    navigate(`/recherche?${params}`)
  }

  const handleCategory = (catId) => {
    navigate(`/recherche?categorie=${catId}`)
  }

  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-nout-secondary py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-nout-dark mb-3 leading-tight">
            La marketplace{' '}
            <span className="text-nout-primary">100 % réunionnaise</span>
          </h1>
          <p className="text-gray-500 text-base mb-8">
            Achetez et vendez vos articles de seconde main partout à La Réunion
          </p>

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-2xl shadow-md"
          >
            <input
              type="text"
              placeholder="Que recherches-tu ?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-3 text-sm text-nout-dark placeholder-gray-400 outline-none"
            />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-4 py-3 text-sm text-nout-dark bg-gray-50 border border-nout-border rounded-xl outline-none cursor-pointer"
            >
              {REUNION_CITIES_WITH_ALL.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary px-6 whitespace-nowrap">
              Rechercher
            </button>
          </form>
        </div>
      </section>

      {/* ── CATÉGORIES ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-nout-dark mb-6">
          Parcourir par catégorie
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.id)}
              className="flex flex-col items-center gap-2 p-3 bg-white border border-nout-border rounded-xl hover:border-nout-primary hover:shadow-sm transition-all group cursor-pointer"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <span className="text-xs text-center text-nout-dark font-medium leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── ANNONCES RÉCENTES ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-nout-dark">Annonces récentes</h2>
          <button
            onClick={() => navigate('/recherche')}
            className="text-nout-primary text-sm font-semibold hover:underline cursor-pointer"
          >
            Voir tout →
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-6xl mb-4">🏝️</p>
            <p className="text-lg font-semibold text-nout-dark">Aucune annonce pour le moment</p>
            <p className="text-sm mt-1">Sois le premier à publier !</p>
            <button
              onClick={() => navigate('/publier')}
              className="btn-primary mt-6 px-8"
            >
              Publier une annonce
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────── */}
      <section className="bg-nout-secondary py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-nout-dark text-center mb-10">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ icon, title, desc }, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-nout-primary text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-4 shadow-md">
                  {icon}
                </div>
                <h3 className="font-bold text-nout-dark text-base mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/inscription')}
              className="btn-primary px-10 py-3 text-base"
            >
              Rejoindre NOUT gratuitement
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
