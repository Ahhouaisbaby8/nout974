import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfile } from '../services/profiles'
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

export default function Profile() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile]   = useState(null)
  const [listings, setListings] = useState([])
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [showReport, setShowReport] = useState(false)

  const isOwnProfile = user?.id === id

  useEffect(() => {
    Promise.all([
      getProfile(id),
      getUserListings(id),
      getSellerReviews(id),
    ])
      .then(([p, l, r]) => {
        setProfile(p)
        setListings(l.filter(a => !a.is_sold && a.is_active))
        setReviews(r)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

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
      <p className="text-5xl mb-4">👤</p>
      <p className="text-lg font-semibold text-nout-dark">Profil introuvable</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Retour à l'accueil</button>
    </div>
  )

  const avatarUrl = getAvatarUrl(profile.avatar_url)

  const avgRating  = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const memberMonths = Math.floor((Date.now() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 30))
  const memberLabel  = memberMonths < 1  ? '< 1 mois'
    : memberMonths < 12 ? `${memberMonths} mois`
    : `${Math.floor(memberMonths / 12)} an${Math.floor(memberMonths / 12) > 1 ? 's' : ''}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <BackButton />

      {/* ── CARTE PROFIL ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profile.username} className="w-24 h-24 rounded-full object-cover border-4 border-nout-primary" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-nout-primary text-white flex items-center justify-center text-4xl font-bold border-4 border-nout-primary">
              {profile.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold text-nout-dark">{profile.username}</h1>
          {profile.city && (
            <p className="text-sm text-gray-400 mt-1">📍 {profile.city}</p>
          )}
          {profile.bio && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{profile.bio}</p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Membre depuis {formatRelativeDate(profile.created_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {isOwnProfile ? (
            <Link to="/parametres" className="btn-secondary px-5 py-2 text-sm">
              ✏️ Modifier mon profil
            </Link>
          ) : user ? (
            <>
              <button
                onClick={() => navigate(`/messages/${id}`)}
                className="btn-primary px-5 py-2 text-sm"
              >
                💬 Envoyer un message
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors text-center"
              >
                🚩 Signaler
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── MINI-STATS ── */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-[#1A3A8F]">{listings.length}</p>
          <p className="text-[11px] text-nout-muted mt-1">annonce{listings.length !== 1 ? 's' : ''} active{listings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-[#1A3A8F]">
            {avgRating ? `${avgRating} ⭐` : '—'}
          </p>
          <p className="text-[11px] text-nout-muted mt-1">
            {avgRating ? `${reviews.length} avis` : 'pas encore noté'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-[#1A3A8F]">{memberLabel}</p>
          <p className="text-[11px] text-nout-muted mt-1">membre depuis</p>
        </div>
      </div>

      {/* ── AVIS VENDEUR ── */}
      {reviews.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-nout-dark mb-3 flex items-center gap-2">
            Avis
            <span className="flex items-center gap-1">
              <Stars rating={Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)} />
              <span className="text-sm font-normal text-gray-400 ml-1">
                {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} · {reviews.length} avis
              </span>
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {reviews.slice(0, 5).map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        </div>
      )}

      {/* ── ANNONCES ── */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-nout-dark mb-4">
          Annonces de {profile.username}
          {listings.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({listings.length})</span>
          )}
        </h2>

        {listings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
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
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal
          targetUserId={id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
