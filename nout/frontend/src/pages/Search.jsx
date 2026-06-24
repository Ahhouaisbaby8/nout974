import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getListings } from '../services/listings'
import { getFavoriteIds } from '../services/favorites'
import { CATEGORIES, CONDITIONS, BRANDS } from '../utils/categories'
import { REUNION_CITIES_WITH_ALL } from '../utils/cities'
import ListingCard from '../components/ui/ListingCard'
import Spinner from '../components/ui/Spinner'
import SkeletonCard from '../components/ui/SkeletonCard'

const PRICE_MAX = 5000
const PER_PAGE  = 20

export default function Search() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Lire les filtres depuis l'URL
  const [query,    setQuery]    = useState(searchParams.get('q')         ?? '')
  const [category, setCategory] = useState(searchParams.get('categorie') ?? '')
  const [city,     setCity]     = useState(searchParams.get('ville')     ?? 'Toute La Réunion')
  const [condition,setCondition]= useState(searchParams.get('etat')      ?? '')
  const [brand,    setBrand]    = useState(searchParams.get('marque')    ?? '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min')       ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max')       ?? '')
  const [sortBy,   setSortBy]   = useState(searchParams.get('tri')       ?? 'recent')
  const [showFilters, setShowFilters] = useState(false)

  const [listings,  setListings]  = useState([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [favIds,    setFavIds]    = useState(new Set())

  const buildParams = useCallback(() => ({
    search:   query    || undefined,
    category: category || undefined,
    city:     (city && city !== 'Toute La Réunion') ? city : undefined,
    condition:condition || undefined,
    brand:    brand     || undefined,
    minPrice: minPrice  || undefined,
    maxPrice: maxPrice  || undefined,
    sortBy,
  }), [query, category, city, condition, brand, minPrice, maxPrice, sortBy])

  const runSearch = useCallback(async (reset = true) => {
    const p = reset ? 1 : page + 1
    if (reset) {
      setLoading(true)
      setPage(1)
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0
      window.scrollTo(0, 0)
    } else {
      setLoadingMore(true)
    }

    try {
      const { data, count } = await getListings({ ...buildParams(), page: p, limit: PER_PAGE })
      if (reset) {
        setListings(data ?? [])
      } else {
        setListings(prev => [...prev, ...(data ?? [])])
        setPage(p)
      }
      setTotal(count ?? 0)
    } catch {
      if (reset) setListings([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [buildParams, page])

  useEffect(() => {
    if (!user) { setFavIds(new Set()); return }
    getFavoriteIds(user.id).then(setFavIds).catch(() => {})
  }, [user?.id])

  // Lancer la recherche au chargement + quand l'URL change
  useEffect(() => {
    runSearch(true)
    // Sync URL
    const p = {}
    if (query)    p.q         = query
    if (category) p.categorie = category
    if (city && city !== 'Toute La Réunion') p.ville = city
    if (condition) p.etat     = condition
    if (brand)    p.marque    = brand
    if (minPrice) p.min       = minPrice
    if (maxPrice) p.max       = maxPrice
    if (sortBy !== 'recent') p.tri = sortBy
    setSearchParams(p, { replace: true })
  }, [query, category, city, condition, brand, minPrice, maxPrice, sortBy])

  const handleSubmit = (e) => {
    e.preventDefault()
    runSearch(true)
  }

  const resetFilters = () => {
    setCategory('')
    setCity('Toute La Réunion')
    setCondition('')
    setBrand('')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('recent')
  }

  const hasFilters = category || (city && city !== 'Toute La Réunion') || condition || brand || minPrice || maxPrice

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── BARRE DE RECHERCHE ── */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Rechercher une annonce..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 input-field"
        />
        <button type="submit" className="btn-primary px-5">
                  </button>
        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          className={`px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
            hasFilters
              ? 'border-nout-primary text-nout-primary bg-[#EAF6F5]'
              : 'border-nout-border text-gray-500 bg-white hover:border-nout-primary'
          }`}
        >
          Filtres {hasFilters && '•'}
        </button>
      </form>

      {/* ── FILTRES ── */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Catégorie</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field text-sm py-2">
              <option value="">Toutes</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ville</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm py-2">
              {REUNION_CITIES_WITH_ALL.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">État</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input-field text-sm py-2">
              <option value="">Tous</option>
              {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Marque</label>
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className="input-field text-sm py-2">
              <option value="">Toutes</option>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Prix min (€)</label>
            <input
              type="number" min="0" max={PRICE_MAX} placeholder="0"
              value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
              className="input-field text-sm py-2"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Prix max (€)</label>
            <input
              type="number" min="0" max={PRICE_MAX} placeholder={PRICE_MAX}
              value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
              className="input-field text-sm py-2"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Trier par</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field text-sm py-2">
              <option value="recent">Plus récent</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>

          {hasFilters && (
            <div className="col-span-2 sm:col-span-3 flex justify-end">
              <button onClick={resetFilters} className="text-sm text-nout-primary hover:underline">
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RÉSULTATS ── */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {loading ? '...' : (
            total === 0
              ? 'Aucun résultat'
              : `${total} annonce${total > 1 ? 's' : ''}`
          )}
          {query && <span className="font-semibold text-nout-dark"> pour « {query} »</span>}
        </p>
        {category && (
          <span className="text-xs bg-[#EAF6F5] text-nout-primary font-medium px-3 py-1 rounded-full">
            {CATEGORIES.find(c => c.id === category)?.label}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4"></p>
          <p className="text-lg font-semibold text-nout-dark">Aucune annonce trouvée</p>
          <p className="text-sm mt-1">Essaie avec d'autres mots-clés ou retire des filtres.</p>
          {hasFilters && (
            <button onClick={resetFilters} className="btn-primary mt-5 px-8">
              Retirer les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(l => <ListingCard key={l.id} listing={l} isFavorited={favIds.has(l.id)} />)}
          </div>

          {listings.length < total && (
            <div className="text-center mt-8">
              <button
                onClick={() => runSearch(false)}
                disabled={loadingMore}
                className="btn-secondary px-10"
              >
                {loadingMore ? 'Chargement…' : 'Voir plus d\'annonces'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
