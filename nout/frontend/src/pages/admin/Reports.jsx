import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getReports, updateReportStatus } from '../../services/reports'
import { formatRelativeDate } from '../../utils/formatters'

const STATUS_LABELS = {
  pending:  { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Résolu',     cls: 'bg-green-100 text-green-700' },
  ignored:  { label: 'Ignoré',     cls: 'bg-gray-100 text-gray-500' },
}

const REASON_ICONS = {
  'Contenu inapproprié':                              '🔞',
  'Arnaque / fraude':                                 '💸',
  'Contenu interdit (prostitution, drogues, armes...)': '🚫',
  'Insultes / harcèlement':                           '😡',
  'Autre':                                            '❓',
}

export default function AdminReports() {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter,  setFilter]    = useState('pending')
  const [pending, setPending]   = useState(0)

  const load = async (f) => {
    setLoading(true)
    try {
      const data = await getReports(f)
      setReports(data)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(filter)
  }, [filter])

  // Compteur "en attente" indépendant du filtre actif
  useEffect(() => {
    getReports('pending').then(d => setPending(d.length)).catch(() => {})
  }, [])

  const resolve = async (id, status) => {
    await updateReportStatus(id, status)
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (filter === 'pending') setPending(c => Math.max(0, c - 1))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-nout-dark">
          Signalements
          {pending > 0 && (
            <span className="ml-2 text-base font-semibold text-white bg-red-500 rounded-full px-2.5 py-0.5">
              {pending}
            </span>
          )}
        </h1>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[['pending','En attente'],['resolved','Résolus'],['ignored','Ignorés'],['all','Tous']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === val ? 'bg-nout-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Aucun signalement.</p>
          )}

          {reports.map(r => {
            const isListingReport = !!r.listing
            const isProfileReport = !!r.reported_profile && !isListingReport
            const statusInfo = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending
            const reasonIcon = REASON_ICONS[r.reason] ?? '🚩'

            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">

                    {/* Type + cible */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        isListingReport ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        {isListingReport ? 'Annonce' : 'Profil'}
                      </span>

                      {isListingReport && r.listing && (
                        <Link
                          to={`/annonce/${r.listing.id}`}
                          target="_blank"
                          className="text-sm font-semibold text-nout-primary hover:underline truncate"
                        >
                          "{r.listing.title}"
                        </Link>
                      )}
                      {isProfileReport && r.reported_profile && (
                        <Link
                          to={`/profil/${r.reported_profile.id}`}
                          target="_blank"
                          className="text-sm font-semibold text-nout-primary hover:underline"
                        >
                          @{r.reported_profile.username}
                        </Link>
                      )}
                    </div>

                    {/* Signalé par */}
                    <p className="text-xs text-gray-400">
                      Signalé par <span className="font-medium text-gray-600">@{r.reporter?.username ?? '—'}</span>
                      {' · '}{formatRelativeDate(r.created_at)}
                    </p>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Motif */}
                <p className="text-sm text-gray-700 mb-1">
                  <span className="mr-1">{reasonIcon}</span>
                  <strong>{r.reason}</strong>
                </p>
                {r.details && (
                  <p className="text-sm text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 mt-1">
                    "{r.details}"
                  </p>
                )}

                {/* Actions */}
                {r.status === 'pending' && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => resolve(r.id, 'resolved')}
                      className="text-sm text-green-600 font-semibold hover:underline"
                    >
                      ✅ Résoudre
                    </button>
                    <button
                      onClick={() => resolve(r.id, 'ignored')}
                      className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
                    >
                      Ignorer
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
