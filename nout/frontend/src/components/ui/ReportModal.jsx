import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createReport } from '../../services/reports'

const REASONS = [
  'Article interdit ou illégal',
  'Prix abusif ou arnaque',
  'Photos volées ou trompeuses',
  'Contenu offensant',
  'Spam ou doublon',
  'Autre',
]

export default function ReportModal({ listingId = null, targetUserId = null, onClose }) {
  const { user } = useAuth()
  const [reason, setReason]   = useState('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason) return
    setSending(true)
    try {
      await createReport({
        reporterId: user.id,
        listingId,
        userId: targetUserId,
        reason,
        details,
      })
      setDone(true)
    } catch {
      alert('Erreur. Réessaie.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>

        {done ? (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-bold text-nout-dark text-lg mb-1">Signalement envoyé</p>
            <p className="text-sm text-gray-500 mb-5">Merci. Notre équipe va examiner ça.</p>
            <button onClick={onClose} className="btn-primary px-8">Fermer</button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-nout-dark">Signaler</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-nout-dark mb-2">Raison du signalement</label>
                <div className="flex flex-col gap-2">
                  {REASONS.map(r => (
                    <label key={r} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="accent-nout-primary"
                      />
                      <span className="text-sm text-nout-dark">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-nout-dark mb-1">
                  Détails <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Explique brièvement le problème..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  className="input-field resize-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={!reason || sending}
                className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Envoi…' : 'Envoyer le signalement'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
