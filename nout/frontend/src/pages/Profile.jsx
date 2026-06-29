import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPublicProfile } from '../services/profiles'
import { getUserListings } from '../services/listings'
import { getSellerReviews } from '../services/reviews'
import { getAvatarUrl } from '../utils/avatar'
import { formatRelativeDate } from '../utils/formatters'
import ListingCard from '../components/ui/ListingCard'
import ReviewCard from '../components/ui/ReviewCard'
import { Stars } from '../components/ui/ReviewCard'
import Spinner from '../components/ui/Spinner'
import SkeletonCard from '../components/ui/SkeletonCard'
import BackButton from '../components/ui/BackButton'
import ReportModal from '../components/ui/ReportModal'
import { resolveFounder, FounderRing } from '../components/ui/FounderBadge'
import CreatorBadge from '../components/ui/CreatorBadge'
import { isFollowing as checkFollowing, followUser, unfollowUser, getFollowCounts } from '../services/follow'
import { getPublicSellerStats } from '../services/sellerStats'

export default function Profile() {
  const { id } = useParams()
  const { user, profile: myProfile } = useAuth()   // myProfile = profil de l'utilisateur connecté (pour la notif d'abonnement)
  const navigate = useNavigate()

  const [profile, setProfile]   = useState(null)
  const [listings, setListings] = useState([])
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [tab, setTab] = useState('articles')   // 'articles' | 'avis'
  const [following, setFollowing]   = useState(false)   // suis-je abonné à ce profil ?
  const [followBusy, setFollowBusy] = useState(false)   // requête en cours
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [nbVentes, setNbVentes] = useState(0)

  const isOwnProfile = user?.id === id

  const handleToggleFollow = async () => {
    if (!user) { navigate('/connexion'); return }
    if (followBusy) return
    setFollowBusy(true)
    // Optimiste : on met à jour l'UI tout de suite
    const wasFollowing = following
    setFollowing(!wasFollowing)
    setCounts(c => ({ ...c, followers: c.followers + (wasFollowing ? -1 : 1) }))
    try {
      if (wasFollowing) {
        await unfollowUser(user.id, id)
      } else {
        await followUser(user.id, id, myProfile?.username)
      }
    } catch {
      // Rollback en cas d'échec
      setFollowing(wasFollowing)
      setCounts(c => ({ ...c, followers: c.followers + (wasFollowing ? 1 : -1) }))
    } finally {
      setFollowBusy(false)
    }
  }

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/profil/${id}`
    if (navigator.share) {
      try { await navigator.share({ title: `Vitrine de ${profile?.username} sur NOUT`, url }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(url) } catch {}
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const p = await getPublicProfile(id)
        if (!p) { setNotFound(true); return }
        setProfile(p)
        // Listings et avis non-bloquants : leur échec n'empêche pas d'afficher le profil
        const [l, r] = await Promise.all([
          getUserListings(id).catch(() => []),
          getSellerReviews(id).catch(() => []),
        ])
        setListings(l.filter(a => !a.is_sold && a.is_active))
        setReviews(r)
        // Compteurs abonnés/abonnements + ventes + statut (non-bloquants)
        getFollowCounts(id).then(setCounts).catch(() => {})
        getPublicSellerStats(id).then(s => setNbVentes(s.nbVentes)).catch(() => {})
        if (user && user.id !== id) {
          checkFollowing(user.id, id).then(setFollowing).catch(() => {})
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user?.id])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 mb-6 animate-pulse">
        <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <div className="h-6 bg-gray-200 rounded-full w-1/3" />
          <div className="h-4 bg-gray-100 rounded-full w-1/2" />
          <div className="h-3 bg-gray-100 rounded-full w-1/4" />
        </div>
      </div>
      <div className="h-5 bg-gray-200 rounded-full animate-pulse w-36 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (notFound) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg font-semibold text-nout-dark">Profil introuvable</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Retour à l'accueil</button>
    </div>
  )

  const avatarUrl = getAvatarUrl(profile.avatar_url)
  const { isFounder, founderNumber, showBadge } = resolveFounder(profile)

  const avgRating  = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const latestListing = listings.reduce((latest, l) =>
    !latest || new Date(l.created_at) > new Date(latest.created_at) ? l : latest
  , null)
  const isSellerActive = latestListing &&
    Date.now() - new Date(latestListing.created_at).getTime() < 30 * 24 * 60 * 60 * 1000

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* SEO — la boutique publique du vendeur (hoisting natif React 19) */}
      <title>{`${profile.username} — Boutique seconde main NOUT 974`}</title>
      <meta name="description" content={`Découvre la boutique de ${profile.username} sur NOUT, le marketplace seconde main de La Réunion (974) : articles d'occasion, remise en main propre ou livraison, paiement sécurisé.`} />
      <link rel="canonical" href={`https://nout.re/profil/${id}`} />

      <BackButton />

      {/* ── CARTE PROFIL ── */}
      <div className="rounded-2xl shadow-sm overflow-hidden mt-4">

        {isFounder && showBadge ? (
          /* ── Bannière hero sunset — fondateur avec badge actif ── */
          <div className="hero-sunset relative overflow-hidden" style={{ height: 200 }}>
            <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                 style={{ background: 'linear-gradient(to top, rgba(255,120,60,0.20), transparent)' }} />
            <div className="absolute inset-0 pointer-events-none">
              {[
                { top:'12%', left:'8%',  delay:'0s',   size:'w-1 h-1',     color:'bg-white' },
                { top:'22%', left:'18%', delay:'1.1s', size:'w-1 h-1',     color:'bg-white' },
                { top:'9%',  left:'32%', delay:'0.6s', size:'w-1.5 h-1.5', color:'bg-[#00C4B4]' },
                { top:'18%', left:'55%', delay:'1.8s', size:'w-1 h-1',     color:'bg-white' },
                { top:'8%',  right:'28%',delay:'0.3s', size:'w-1.5 h-1.5', color:'bg-white' },
                { top:'20%', right:'18%',delay:'1.4s', size:'w-1 h-1',     color:'bg-[#00C4B4]' },
              ].map((s, i) => (
                <div key={i} className={`absolute rounded-full twinkle ${s.size} ${s.color}`}
                     style={{ top: s.top, left: s.left, right: s.right, animationDelay: s.delay }} />
              ))}
            </div>
            {/* Palmier déco — silhouette sombre bien cadrée, en bas à droite */}
            <div className="absolute bottom-0 pointer-events-none select-none" style={{ right: 16, opacity: 0.4 }}>
              <svg width="92" height="100" viewBox="0 0 100 110" fill="none">
                <path d="M50 108 Q48 80 47 55 Q46 40 50 28" stroke="rgba(4,2,0,0.55)" strokeWidth="5" strokeLinecap="round"/>
                <path d="M50 28 Q72 22 92 30" stroke="rgba(4,2,0,0.5)"  strokeWidth="4"   strokeLinecap="round"/>
                <path d="M50 28 Q28 22 8 30"  stroke="rgba(4,2,0,0.5)"  strokeWidth="4"   strokeLinecap="round"/>
                <path d="M50 28 Q66 12 84 8"  stroke="rgba(4,2,0,0.4)"  strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M50 28 Q34 12 16 8"  stroke="rgba(4,2,0,0.4)"  strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M50 28 Q50 8 50 2"   stroke="rgba(4,2,0,0.35)" strokeWidth="3"   strokeLinecap="round"/>
                <circle cx="50" cy="27" r="4" fill="rgba(4,2,0,0.45)"/>
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end gap-4 z-10">
              <FounderRing size="md" founderNumber={founderNumber}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-nout-turquoise to-nout-lagon flex items-center justify-center text-2xl font-bold text-white">
                      {profile.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                }
              </FounderRing>
              <div className="flex-1 pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold text-white leading-tight">{profile.username}</h1>
                  {profile.is_creator && <CreatorBadge size="sm" />}
                  {isSellerActive && (
                    <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      Vendeur actif
                    </span>
                  )}
                </div>
                {avgRating && (
                  <p className="flex items-center gap-1.5 text-[13px] text-white/90 mt-1">
                    <span className="text-[#FFD84A]">★</span>
                    <span className="font-semibold">{avgRating}</span>
                    <span className="text-white/60">({reviews.length} avis)</span>
                  </p>
                )}
                {profile.city && (
                  <p className="text-[11px] text-white/60 mt-0.5">{profile.city}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── En-tête normale — non fondateur ou badge désactivé ── */
          <div className="bg-white px-5 pt-5 pb-4 flex items-center gap-4 border-b border-gray-100">
            <div className="w-[72px] h-[72px] rounded-full overflow-hidden flex-shrink-0 ring-1 ring-[#E8EDF3] shadow-sm">
              {avatarUrl
                ? <img src={avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-[#EAF5F3] flex items-center justify-center text-2xl font-bold text-[#0E8C82]">
                    {profile.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-nout-dark leading-tight">{profile.username}</h1>
                {profile.is_creator && <CreatorBadge size="sm" />}
                {isSellerActive && (
                  <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Vendeur actif
                  </span>
                )}
              </div>
              {profile.city && (
                <p className="text-[11px] text-gray-500 mt-0.5">{profile.city}</p>
              )}
            </div>
          </div>
        )}

        {/* Partie blanche : bio, actions, date */}
        <div className="bg-white px-5 py-4 flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1">
            {profile.bio && (
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{profile.bio}</p>
            )}
            {/* Badges de confiance (wrappent sur mobile) */}
            <div className="flex flex-wrap gap-2 mb-2">
              {/* Email confirmé : tout compte NOUT a un email vérifié via Supabase Auth */}
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1A3A8F] bg-[#1A3A8F]/8 px-2.5 py-1 rounded-full">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                Email confirmé
              </span>
              {/* Téléphone vérifié : affiché si l'utilisateur a renseigné un numéro */}
              {profile.has_phone && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>
                  Téléphone vérifié
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Membre depuis {formatRelativeDate(profile.created_at)}
            </p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
            {isOwnProfile ? (
              <>
                <Link to="/compte/profil" className="btn-secondary px-5 py-2 text-sm text-center">
                  Modifier mon profil
                </Link>
                <button onClick={handleShareProfile} className="btn-secondary px-5 py-2 text-sm">
                  Partager la vitrine
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleFollow}
                  disabled={followBusy}
                  className={`px-5 py-2 text-sm rounded-full font-semibold transition-all disabled:opacity-60 ${
                    following
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-[#0E8C82] text-white hover:bg-[#0B716A]'
                  }`}
                >
                  {following ? 'Abonné' : "S'abonner"}
                </button>
                {user && (
                  <button
                    onClick={() => navigate(`/messages/${id}`)}
                    className="btn-secondary px-5 py-2 text-sm"
                  >
                    Envoyer un message
                  </button>
                )}
                <button onClick={handleShareProfile} className="btn-secondary px-5 py-2 text-sm">
                  Partager la vitrine
                </button>
                {user && (
                  <button
                    onClick={() => setShowReport(true)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors text-center"
                  >
                    Signaler
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MINI-STATS ── */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-lg sm:text-2xl font-extrabold text-[#1A3A8F]">{nbVentes}</p>
          <p className="text-[11px] text-nout-muted mt-1">vente{nbVentes !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-lg sm:text-2xl font-extrabold text-[#1A3A8F]">{counts.followers}</p>
          <p className="text-[11px] text-nout-muted mt-1">abonné{counts.followers !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-lg sm:text-2xl font-extrabold text-[#1A3A8F]">{listings.length}</p>
          <p className="text-[11px] text-nout-muted mt-1">annonce{listings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-lg sm:text-2xl font-extrabold text-[#1A3A8F]">
            {avgRating ? `${avgRating} ` : '—'}
          </p>
          <p className="text-[11px] text-nout-muted mt-1">
            {avgRating ? `${reviews.length} avis` : 'pas noté'}
          </p>
        </div>
      </div>

      {/* ── ONGLETS Articles / Avis ── */}
      <div className="flex border-b border-gray-200 mt-8">
        <button
          onClick={() => setTab('articles')}
          className={`flex-1 sm:flex-none sm:px-8 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            tab === 'articles' ? 'text-nout-dark border-nout-turquoise' : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          Articles{listings.length > 0 ? ` · ${listings.length}` : ''}
        </button>
        <button
          onClick={() => setTab('avis')}
          className={`flex-1 sm:flex-none sm:px-8 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            tab === 'avis' ? 'text-nout-dark border-nout-turquoise' : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          Avis{reviews.length > 0 ? ` · ${reviews.length}` : ''}
        </button>
      </div>

      {/* ── CONTENU ONGLET ARTICLES ── */}
      {tab === 'articles' && (
        <div className="mt-5">
          {listings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">
                {isOwnProfile ? "Tu n'as pas encore publié d'annonce." : "Aucune annonce active pour le moment."}
              </p>
              {isOwnProfile && (
                <button onClick={() => navigate('/publier')} className="btn-primary mt-5 px-8">
                  Publier une annonce
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} isFounderSeller={isFounder && showBadge} founderNumber={founderNumber} />)}
            </div>
          )}
        </div>
      )}

      {/* ── CONTENU ONGLET AVIS ── */}
      {tab === 'avis' && (
        <div className="mt-5">
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Aucun avis pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
        </div>
      )}

      {showReport && (
        <ReportModal
          targetUserId={id}
          onClose={() => setShowReport(false)}
        />
      )}

      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-nout-dark text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl pointer-events-none">
          Lien de la vitrine copié
        </div>
      )}
    </div>
  )
}
