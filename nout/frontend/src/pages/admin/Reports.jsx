import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { getReports, updateReportStatus, updateAdminNote } from '../../services/reports'
import { adminAction } from '../../lib/adminApi'
import { formatRelativeDate } from '../../utils/formatters'

const STATUS_LABELS = {
  pending:  { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Résolu',     cls: 'bg-green-100 text-green-700' },
  ignored:  { label: 'Ignoré',     cls: 'bg-gray-100 text-gray-500' },
}

const REASON_ICONS = {
  'Contenu inapproprié':                               '🔞',
  'Arnaque / fraude':                                  '💸',
  'Contenu interdit (prostitution, drogues, armes...)': '🚫',
  'Insultes / harcèlement':                            '😡',
  'Spam ou doublon':                                   '🔁',
  'Autre':                                             '❓',
}

function BadgeType({ report }) {
  if (report.listing_id)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Annonce</span>
  if (report.message_id)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Message</span>
  if (report.user_id)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Utilisateur</span>
  return null
}

function ListingActions({ report, onAction, loading }) {
  if (report.status !== 'pending') return null
  return (
    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
      <button disabled={loading} onClick={() => onAction(report, 'remove_listing')}
        className="text-sm text-red-600 font-semibold hover:underline disabled:opacity-40">
        🗑️ Supprimer l'annonce
      </button>
      <button disabled={loading} onClick={() => onAction(report, 'deactivate_listing')}
        className="text-sm text-orange-500 font-semibold hover:underline disabled:opacity-40">
        🚫 Désactiver
      </button>
      <button disabled={loading} onClick={() => onAction(report, 'ignored')}
        className="text-sm text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-40">
        Ignorer
      </button>
    </div>
  )
}

function UserActions({ report, onAction, loading }) {
  if (report.status !== 'pending') return null
  return (
    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
      <button disabled={loading} onClick={() => onAction(report, 'warn_user')}
        className="text-sm text-yellow-600 font-semibold hover:underline disabled:opacity-40">
        ⚠️ Avertir
      </button>
      <button disabled={loading} onClick={() => onAction(report, 'suspend_user')}
        className="text-sm text-orange-600 font-semibold hover:underline disabled:opacity-40">
        ⏸️ Suspendre 7j
      </button>
      <button disabled={loading} onClick={() => onAction(report, 'ban_user')}
        className="text-sm text-red-600 font-semibold hover:underline disabled:opacity-40">
        🚫 Bannir
      </button>
      <button disabled={loading} onClick={() => onAction(report, 'ignored')}
        className="text-sm text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-40">
        Ignorer
      </button>
    </div>
  )
}

function MessageActions({ report, onAction, loading }) {
  if (report.status !== 'pending') return null
  return (
    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
      <button disabled={loading} onClick={() => onAction(report, 'resolved')}
        className="text-sm text-green-600 font-semibold hover:underline disabled:opacity-40">
        ✅ Résoudre
      </button>
      <button disabled={loading} onClick={() => onAction(report, 'ignored')}
        className="text-sm text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-40">
        Ignorer
      </button>
    </div>
  )
}

export default function AdminReports() {
  const [reports, setReports]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('pending')
  const [pending, setPending]     = useState(0)
  const [actionLoading, setActionLoading] = useState({})
  const [notes, setNotes]         = useState({})
  const [savingNote, setSavingNote] = useState({})
  const [actionFeedback, setActionFeedback] = useState({})

  const load = async (f) => {
    setLoading(true)
    try {
      const data = await getReports(f)
      setReports(data)
      const initialNotes = {}
      data.forEach(r => { initialNotes[r.id] = r.admin_note ?? '' })
      setNotes(initialNotes)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])

  useEffect(() => {
    getReports('pending').then(d => setPending(d.length)).catch(() => {})
  }, [])

  const handleAction = async (report, action) => {
    setActionLoading(prev => ({ ...prev, [report.id]: true }))
    try {
      const listingId = report.listing?.id ?? report.listing_id
      const userId    = report.reported_profile?.id ?? report.user_id

      if (action === 'remove_listing') {
        await adminAction('remove_listing', listingId)
        await updateReportStatus(report.id, 'resolved')
      } else if (action === 'deactivate_listing') {
        await adminAction('suspend_listing', listingId)
        await updateReportStatus(report.id, 'resolved')
      } else if (action === 'warn_user') {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/.netlify/functions/send-warning', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        })
        if (!res.ok) throw new Error('Erreur envoi email')
        await updateReportStatus(report.id, 'resolved')
        setActionFeedback(prev => ({ ...prev, [report.id]: '✅ Avertissement envoyé par email' }))
      } else if (action === 'suspend_user') {
        await adminAction('suspend_user', userId)
        await updateReportStatus(report.id, 'resolved')
      } else if (action === 'ban_user') {
        await adminAction('ban_user', userId)
        await updateReportStatus(report.id, 'resolved')
      } else if (action === 'resolved' || action === 'ignored') {
        await updateReportStatus(report.id, action)
      }

      const newStatus = action === 'ignored' ? 'ignored' : 'resolved'
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: newStatus } : r))
      if (filter === 'pending') setPending(c => Math.max(0, c - 1))
    } catch (err) {
      console.error('Action error:', err)
      alert('Une erreur est survenue. Réessaie.')
    } finally {
      setActionLoading(prev => ({ ...prev, [report.id]: false }))
    }
  }

  const saveNote = async (reportId) => {
    setSavingNote(prev => ({ ...prev, [reportId]: true }))
    try {
      await updateAdminNote(reportId, notes[reportId] ?? '')
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, admin_note: notes[reportId] } : r))
    } catch {
      alert('Erreur lors de la sauvegarde.')
    } finally {
      setSavingNote(prev => ({ ...prev, [reportId]: false }))
    }
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
            const isListing = !!r.listing_id
            const isUser    = !!r.user_id && !isListing
            const isMessage = !!r.message_id && !isListing && !r.user_id
            const statusInfo  = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending
            const reasonIcon  = REASON_ICONS[r.reason] ?? '🚩'
            const actLoading  = !!actionLoading[r.id]

            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-5">

                {/* En-tête */}
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <BadgeType report={r} />

                      {isListing && r.listing && (
                        <Link to={`/annonce/${r.listing.id}`} target="_blank"
                          className="text-sm font-semibold text-nout-primary hover:underline truncate">
                          "{r.listing.title}"
                        </Link>
                      )}
                      {isUser && r.reported_profile && (
                        <Link to={`/profil/${r.reported_profile.id}`} target="_blank"
                          className="text-sm font-semibold text-nout-primary hover:underline">
                          @{r.reported_profile.username}
                        </Link>
                      )}
                      {isMessage && (
                        <span className="text-sm text-gray-500">Message #{r.message_id?.slice(0, 8)}</span>
                      )}
                    </div>

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

                {/* Feedback action (ex: email envoyé) */}
                {actionFeedback[r.id] && (
                  <p className="text-xs text-green-600 mt-2">{actionFeedback[r.id]}</p>
                )}

                {/* Boutons contextuels */}
                {isListing && <ListingActions report={r} onAction={handleAction} loading={actLoading} />}
                {isUser    && <UserActions    report={r} onAction={handleAction} loading={actLoading} />}
                {isMessage && <MessageActions report={r} onAction={handleAction} loading={actLoading} />}

                {/* Note interne admin */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Note interne</label>
                  <div className="flex gap-2 items-start">
                    <textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="Ajoute une note visible uniquement par l'équipe…"
                      value={notes[r.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-nout-primary"
                    />
                    <button
                      onClick={() => saveNote(r.id)}
                      disabled={savingNote[r.id]}
                      className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                      {savingNote[r.id] ? '…' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
