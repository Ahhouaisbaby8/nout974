import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getBlockedProfiles, unblockUser } from '../../services/blocks'
import { getAvatarUrl } from '../../utils/avatar'

// Espace compte > Membres bloqués : liste + déblocage inline.
export default function BlockedUsers() {
  const { user } = useAuth()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId]   = useState(null)
  const [err, setErr]         = useState(false)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getBlockedProfiles(user.id)
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleUnblock = async (id) => {
    if (busyId) return
    setBusyId(id)
    try {
      await unblockUser(user.id, id)
      setList(l => l.filter(b => b.id !== id))
    } catch {
      setErr(true)
      setTimeout(() => setErr(false), 3000)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="font-title text-[22px] font-bold text-nout-texte mb-1">Membres bloqués</h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Un membre bloqué ne peut plus t'écrire ni te faire d'offre, et tu ne vois plus ses messages.
        Tu peux le débloquer à tout moment.
      </p>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 mb-4">
          Le déblocage a échoué. Réessaie.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Tu n'as bloqué personne.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#EEF2F7]">
          {list.map(b => {
            const avatar = getAvatarUrl(b.avatar_url)
            return (
              <div key={b.id} className="flex items-center gap-3 py-3">
                <Link to={`/profil/${b.id}`} className="flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt={b.username} className="w-10 h-10 rounded-full object-cover ring-1 ring-[#E8EDF3]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#EAF5F3] text-[#0E8C82] flex items-center justify-center font-bold ring-1 ring-[#E8EDF3]">
                      {b.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profil/${b.id}`} className="block font-semibold text-sm text-nout-texte hover:underline truncate">
                    {b.username ?? 'Membre'}
                  </Link>
                  {b.city && <p className="text-xs text-gray-400 truncate">{b.city}</p>}
                </div>
                <button
                  onClick={() => handleUnblock(b.id)}
                  disabled={busyId === b.id}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
                >
                  {busyId === b.id ? 'Patiente…' : 'Débloquer'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
