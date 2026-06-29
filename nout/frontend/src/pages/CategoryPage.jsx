import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getListings } from '../services/listings'
import { getFavoriteIds } from '../services/favorites'
import { findCategoryBySlug } from '../utils/categories'
import ListingCard from '../components/ui/ListingCard'
import SkeletonCard from '../components/ui/SkeletonCard'

const PER_PAGE = 20

// Page catégorie crawlable : /c/:slug — vraie URL avec H1 + title + meta + canonical
// (SEO local 974), au lieu du simple querystring /recherche?categorie=.
export default function CategoryPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const match = findCategoryBySlug(slug)

  const root = match?.root ?? null
  const sub  = match?.sub ?? null
  const label = sub?.label ?? root?.label ?? ''

  const [listings,    setListings]    = useState([])
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [favIds,      setFavIds]      = useState(new Set())

  const fetchPage = useCallback(async (reset = true) => {
    if (!match) { setLoading(false); return }
    const filter = sub
      ? { category: root.id, subcategory: sub.id }
      : { category: root.id }
    const p = reset ? 1 : page + 1
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      const { data, count } = await getListings({ ...filter, sortBy: 'recent', page: p, limit: PER_PAGE })
      setListings(prev => reset ? (data ?? []) : [...prev, ...(data ?? [])])
      if (!reset) setPage(p)
      setTotal(count ?? 0)
    } catch {
      if (reset) setListings([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [slug, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0)
    setPage(1)
    fetchPage(true)
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) { setFavIds(new Set()); return }
    getFavoriteIds(user.id).then(setFavIds).catch(() => {})
  }, [user?.id])

  // Slug inconnu : message clair + lien de repli (jamais de page blanche).
  if (!match) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <title>Catégorie introuvable — NOUT 974</title>
        <meta name="robots" content="noindex" />
        <p className="text-lg font-semibold text-nout-dark">Catégorie introuvable</p>
        <p className="text-sm text-gray-500 mt-1">Cette catégorie n'existe pas (ou plus).</p>
        <Link to="/recherche" className="btn-primary mt-6 inline-block px-8">Voir toutes les annonces</Link>
      </div>
    )
  }

  const heading   = `${label} d'occasion à La Réunion (974)`
  const metaDesc  = `Achète et vends ${label.toLowerCase()} d'occasion entre particuliers à La Réunion (974) sur NOUT : prix réunionnais, remise en main propre gratuite ou livraison, paiement sécurisé.`
  const canonical = `https://nout.re/c/${slug}`

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Head SEO — hoisting natif React 19 */}
      <title>{`${heading} — NOUT 974`}</title>
      <meta name="description" content={metaDesc} />
      <link rel="canonical" href={canonical} />

      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1 text-xs text-gray-400 mb-3" aria-label="Fil d'Ariane">
        <Link to="/" className="hover:text-nout-primary">Accueil</Link>
        <ChevronRight className="w-3 h-3" />
        {sub ? (
          <>
            <Link to={`/c/${root.id}`} className="hover:text-nout-primary">{root.label}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600">{sub.label}</span>
          </>
        ) : (
          <span className="text-gray-600">{root.label}</span>
        )}
      </nav>

      <h1 className="font-title font-bold text-xl sm:text-2xl text-nout-texte mb-1">{heading}</h1>
      <p className="text-sm text-gray-500 mb-3">
        {loading ? '…' : (total === 0 ? 'Aucune annonce pour le moment' : `${total} annonce${total > 1 ? 's' : ''}`)}
      </p>

      {/* Intro descriptive — SEO local 974 + repère pour le visiteur */}
      <p className="text-[13px] text-gray-500 leading-relaxed mb-5 max-w-2xl">
        Achète et vends {label.toLowerCase()} d'occasion partout à La Réunion (974) sur NOUT, le marketplace
        100&nbsp;% péi entre particuliers. Remise en main propre gratuite ou livraison Chronopost,
        paiement sécurisé&nbsp;: le vendeur reçoit son prix, l'acheteur est protégé.
      </p>

      {/* Sous-catégories (page racine) — liens internes crawlables */}
      {!sub && root.sub?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {root.sub.map(s => (
            <Link
              key={s.id}
              to={`/c/${s.id}`}
              className="text-sm px-3 py-1.5 rounded-full border border-nout-border text-gray-600 hover:border-nout-primary hover:text-nout-primary transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-semibold text-nout-dark">Aucune annonce dans « {label} » pour l'instant</p>
          <p className="text-sm mt-1">Reviens bientôt, ou explore les autres catégories.</p>
          <Link to="/recherche" className="btn-primary mt-5 inline-block px-8">Voir toutes les annonces</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(l => <ListingCard key={l.id} listing={l} isFavorited={favIds.has(l.id)} />)}
          </div>
          {listings.length < total && (
            <div className="text-center mt-8">
              <button onClick={() => fetchPage(false)} disabled={loadingMore} className="btn-secondary px-10">
                {loadingMore ? 'Chargement…' : 'Voir plus d\'annonces'}
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-8 text-center">
        <Link
          to={`/recherche?categorie=${root.id}${sub ? `&sous=${sub.id}` : ''}`}
          className="text-sm text-nout-primary hover:underline"
        >
          Filtrer par taille, ville, prix…
        </Link>
      </div>
    </div>
  )
}
