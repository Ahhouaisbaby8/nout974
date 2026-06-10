import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export default function EscrowConfirm({ order, onConfirmed }) {
  const { user } = useAuth()

  const [digits, setDigits]       = useState(['', '', '', '', '', ''])
  const [expiresAt, setExpiresAt] = useState(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null) // { type: 'success'|'error'|'expired', msg }
  const inputRefs = useRef([])

  // Guard : visible uniquement pour le vendeur avec statut 'paid'
  const isEligible = user && order.seller_id === user.id && order.status === 'paid'

  useEffect(() => {
    if (!isEligible) return
    supabase
      .from('escrow_codes')
      .select('expires_at, confirmed_at')
      .eq('order_id', order.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        if (data.confirmed_at) { setAlreadyDone(true); return }
        setExpiresAt(data.expires_at)
      })
  }, [order.id, isEligible])

  if (!isEligible || alreadyDone) return null

  // ── Input handlers ──────────────────────────────────────────
  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length !== 6) return
    setDigits(pasted.split(''))
    inputRefs.current[5]?.focus()
  }

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    const code = digits.join('')
    if (code.length < 6 || loading) return

    setLoading(true)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/confirm-escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ order_id: order.id, code }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ type: 'success', msg: '✅ Remise confirmée ! Ton virement est en route.' })
        onConfirmed?.()
      } else {
        const err = data.error ?? ''
        if (err.toLowerCase().includes('incorrect')) {
          setResult({ type: 'error', msg: '❌ Code incorrect. Vérifie le code avec l\'acheteur.' })
        } else if (err.toLowerCase().includes('expiré')) {
          setResult({ type: 'expired', msg: '⏰ Ce code a expiré. L\'acheteur a été remboursé automatiquement.' })
        } else if (err.toLowerCase().includes('déjà')) {
          setResult({ type: 'success', msg: '✅ Cette remise a déjà été confirmée.' })
        } else {
          setResult({ type: 'error', msg: err || 'Une erreur est survenue. Réessaie.' })
        }
        // Vider les cases sauf en cas de succès
        setDigits(['', '', '', '', '', ''])
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      }
    } catch {
      setResult({ type: 'error', msg: 'Erreur réseau. Vérifie ta connexion et réessaie.' })
    } finally {
      setLoading(false)
    }
  }

  const code = digits.join('')
  const isComplete = code.length === 6
  const expiresDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: '#0A0F2C' }}>
      {/* En-tête */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤝</span>
          <h3 className="font-title font-bold text-white text-base">
            Confirmer la remise en main propre
          </h3>
        </div>
        <p className="text-white/50 text-sm">
          Demande le code à 6 chiffres à l'acheteur
        </p>
      </div>

      {/* Corps */}
      <div className="px-3 sm:px-5 py-5">

        {/* Cases de saisie */}
        <div className="flex justify-center gap-1.5 sm:gap-2 mb-4" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading || result?.type === 'success' || result?.type === 'expired'}
              aria-label={`Chiffre ${i + 1}`}
              className={`
                w-9 h-12 sm:w-11 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl
                bg-white/10 text-white border-2 transition-all outline-none
                ${d ? 'border-[#00C4B4]' : 'border-white/20'}
                focus:border-[#00C4B4] focus:bg-white/15
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            />
          ))}
        </div>

        {/* Date d'expiration */}
        {expiresDate && !result && (
          <p className="text-center text-white/40 text-xs mb-4">
            ⏱ Code valable jusqu'au {expiresDate}
          </p>
        )}

        {/* Message résultat */}
        {result && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-4 text-center font-medium ${
            result.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
            result.type === 'expired' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                        'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {result.msg}
          </div>
        )}

        {/* Bouton */}
        {result?.type !== 'success' && result?.type !== 'expired' && (
          <button
            onClick={handleSubmit}
            disabled={!isComplete || loading}
            className={`
              w-full py-4 rounded-xl font-semibold text-sm transition-all duration-200
              ${isComplete && !loading
                ? 'text-white hover:opacity-90 active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
              }
            `}
            style={isComplete && !loading
              ? { background: 'linear-gradient(135deg, #0E7FAB, #00C4B4)' }
              : {}
            }
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Vérification…
                </span>
              : 'Confirmer et recevoir mon paiement'
            }
          </button>
        )}

      </div>
    </div>
  )
}
