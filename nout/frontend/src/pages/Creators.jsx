import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCreators } from '../services/profiles'
import { getAvatarUrl } from '../utils/avatar'
import { formatRelativeDate } from '../utils/formatters'
import { Palette, MapPin } from 'lucide-react'
import BackButton from '../components/ui/BackButton'

// Vitrine « Nos créateurs péi » : met en avant les artisans qui fabriquent à La Réunion.
export default function Creators() {
  const [creators, setCreators] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    document.title = 'Nos créateurs péi — NOUT 974'
    getCreators()
      .then(setCreators)
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => { document.title = 'NOUT — Marketplace seconde main La Réunion 974' }
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />

      {/* En-tête */}
      <div className="mt-4 mb-6 rounded-2xl bg-gradient-to-br from-[#0E7FAB] to-[#00C4B4] text-white p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Made in 974</span>
        </div>
        <h1 className="font-title text-2xl sm:text-3xl font-semibold tracking-tight">Nos créateurs péi</h1>
        <p className="text-sm text-white/85 mt-2 max-w-xl">
          Découvre les artisans qui fabriquent leurs créations ici, à La Réunion.
          Bijoux, vêtements, déco, savons… le savoir-faire péi à soutenir.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-full w-1/2" />
                <div className="h-3 bg-gray-100 rounded-full w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Palette className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-semibold text-nout-dark">Aucun créateur pour le moment</p>
          <p className="text-sm mt-1">Tu fabriques tes propres articles ? Active « Créateur péi » dans tes paramètres.</p>
          <Link to="/parametres" className="btn-primary mt-5 inline-block px-8">Devenir créateur</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creators.map(c => {
            const avatar = getAvatarUrl(c.avatar_url)
            return (
              <Link
                key={c.id}
                to={`/profil/${c.id}`}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
              >
                {avatar ? (
                  <img src={avatar} alt={c.username} className="w-14 h-14 rounded-full object-cover border-2 border-[#00C4B4] flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-nout-turquoise to-nout-lagon text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {c.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-nout-dark truncate">{c.username}</p>
                  {c.creator_craft && (
                    <p className="text-[12px] text-[#0E7FAB] truncate">{c.creator_craft}</p>
                  )}
                  {c.city && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                      <MapPin className="w-3 h-3" /> {c.city}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
