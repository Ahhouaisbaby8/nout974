import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../services/supabase'

// « Mon argent » — le porte-monnaie vendeur.
// L'argent des ventes s'accumule dans le solde Stripe du vendeur (compte connecté, versement manuel) et
// n'est viré vers sa banque QUE quand il clique « Retirer ». Le solde affiché est lu chez Stripe (source
// de vérité) — NOUT ne détient jamais les fonds. La vérification d'identité (KYC) est exigée par Stripe
// avant tout retrait (obligation légale) : on la présente comme « vérifier pour retirer ».
//
// Le vendeur n'a PAS de tableau de bord Stripe (compte 'none') : c'est donc ICI qu'il voit son argent
// bouger → bandeau « virement en route » + historique des retraits (statuts lus chez Stripe).

// Statut de virement Stripe → libellé FR + style de la pastille.
const PAYOUT_STATUS = {
  paid:       { label: 'Reçu',     cls: 'bg-green-50 text-green-700 border-green-200' },
  in_transit: { label: 'En route', cls: 'bg-[#E6F4F2] text-[#0b6f67] border-[#bfe3df]' },
  pending:    { label: 'En route', cls: 'bg-[#E6F4F2] text-[#0b6f67] border-[#bfe3df]' },
  failed:     { label: 'Échoué',   cls: 'bg-red-50 text-red-600 border-red-200' },
  canceled:   { label: 'Annulé',   cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

// Timestamp Unix (secondes) → « 6 juillet 2026 ».
const formatDate = (sec) =>
  sec ? new Date(sec * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default function MyMoney() {
  const [params] = useSearchParams()

  const [state, setState]     = useState(null)   // { activated, payoutsEnabled, detailsSubmitted, available, pending, payouts }
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [payoutLoading, setPayoutLoading]   = useState(false)
  const [toast, setToast]     = useState('')

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` }
  }, [])

  const loadBalance = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/.netlify/functions/wallet-balance', { method: 'POST', headers: await authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Chargement impossible.')
      setState(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { loadBalance() }, [loadBalance])

  // Retour depuis l'onboarding hébergé (?stripe=success|refresh) : juste le toast — le solde est déjà
  // chargé par l'effet de montage (le retour Stripe est une navigation complète → remontage).
  useEffect(() => {
    if (params.get('stripe') === 'success') {
      setToast('Vérification enregistrée. Ton statut se met à jour.')
    }
  }, [params])

  // Retire tout le solde disponible vers la banque du vendeur.
  const withdraw = async () => {
    if (payoutLoading) return
    setError('')
    setPayoutLoading(true)
    try {
      const res = await fetch('/.netlify/functions/request-payout', { method: 'POST', headers: await authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Retrait impossible. Réessaie.')
      setToast(`Retrait de ${data.amount.toFixed(2)} € en route vers ta banque.`)
      await loadBalance()
    } catch (e) {
      setError(e.message)
    } finally {
      setPayoutLoading(false)
    }
  }

  const euro = (n) => `${Number(n ?? 0).toFixed(2)} €`

  const payouts   = state?.payouts ?? []
  const inTransit = payouts.filter(p => p.status === 'in_transit' || p.status === 'pending')

  return (
    <div>
      <h1 className="font-title text-[22px] font-bold text-nout-texte mb-1">Mon argent</h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        L'argent de tes ventes s'accumule ici. Tu le vires sur ton compte bancaire quand tu veux.
      </p>

      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-5">
          {toast}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-28 bg-gray-100 rounded-2xl" />
          <div className="h-12 bg-gray-100 rounded-xl w-1/2" />
        </div>
      ) : (
        <>
          {/* Carte solde */}
          <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFC] p-6 mb-5">
            <p className="text-[13px] text-gray-500 mb-1">Solde disponible</p>
            <p className="text-[34px] font-extrabold text-nout-texte leading-none tabular-nums">
              {euro(state?.available)}
            </p>
            {state?.pending > 0 && (
              <p className="text-[12px] text-gray-500 mt-2">
                {euro(state.pending)} en cours de compensation (disponible sous quelques jours).
              </p>
            )}
          </div>

          {/* Virement(s) en route vers la banque — le vendeur n'a pas de dashboard Stripe, c'est ici
              qu'il voit que son argent arrive. */}
          {inTransit.length > 0 && (
            <div className="rounded-xl border border-[#bfe3df] bg-[#E6F4F2] px-4 py-3 mb-5 space-y-1">
              {inTransit.map((p, i) => (
                <p key={i} className="text-sm text-[#0b6f67] leading-relaxed">
                  <strong>Virement de {euro(p.amount)} en route</strong> vers ta banque
                  {p.arrivalDate ? <> — arrivée prévue le {formatDate(p.arrivalDate)}</> : ''}.
                </p>
              ))}
            </div>
          )}

          {/* Cas 1 — jamais activé : lancer la vérification (sous-page NOUT, zéro page Stripe) */}
          {!state?.activated && (
            <div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Pour retirer tes gains, vérifie ton identité <strong>une seule fois, en 2 minutes,
                directement sur NOUT</strong>. Pas d'entreprise, pas de SIRET : tu restes un
                particulier, comme sur Vinted.
              </p>
              <Link to="/compte/paiements/verifier" className="btn-primary inline-block px-6 py-3 text-sm">
                Vérifier mon identité pour retirer
              </Link>
            </div>
          )}

          {/* Cas 2 — activé mais vérification incomplète : la terminer */}
          {state?.activated && !state?.payoutsEnabled && (
            <div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                <p className="font-semibold text-amber-700 text-sm">Vérification à terminer</p>
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Ton identité ou ton IBAN ne sont pas encore validés. Termine la vérification pour pouvoir retirer.
              </p>
              <Link to="/compte/paiements/verifier" className="btn-primary inline-block px-6 py-3 text-sm">
                Terminer ma vérification
              </Link>
            </div>
          )}

          {/* Cas 3 — prêt : retirer */}
          {state?.activated && state?.payoutsEnabled && (
            <div>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                <p className="font-semibold text-green-700 text-sm">Paiements activés</p>
              </div>
              <button
                type="button"
                onClick={withdraw}
                disabled={payoutLoading || !(state?.available > 0)}
                className="btn-primary px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {payoutLoading
                  ? 'Retrait en cours…'
                  : state?.available > 0 ? `Retirer ${euro(state.available)}` : 'Rien à retirer'}
              </button>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Le virement arrive sur ton compte sous 1 à 3 jours ouvrés.
              </p>
              <Link to="/compte/paiements/verifier" className="inline-block text-sm text-[#0E8C82] font-medium hover:underline mt-2">
                Gérer mes informations bancaires
              </Link>
            </div>
          )}

          {/* Historique des retraits — le vendeur suit ses virements ici (pas de dashboard Stripe). */}
          {payouts.length > 0 && (
            <div className="mt-7">
              <p className="text-[13px] font-semibold text-nout-texte mb-2">Derniers retraits</p>
              <div className="rounded-xl border border-[#E6EAF0] divide-y divide-[#F0F2F4]">
                {payouts.map((p, i) => {
                  const s = PAYOUT_STATUS[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-nout-texte tabular-nums">{euro(p.amount)}</p>
                        <p className="text-[12px] text-gray-400">{formatDate(p.arrivalDate || p.created)}</p>
                      </div>
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Mention PSP (transparence + cadre légal) : les fonds sont détenus par Stripe, prestataire de
          services de paiement agréé — jamais par NOUT. Même rôle que la mention Mangopay chez Vinted. */}
      <p className="text-xs text-gray-400 mt-6 leading-relaxed border-t border-gray-100 pt-4">
        Ton porte-monnaie NOUT est géré par <strong>Stripe</strong>, notre prestataire de services de paiement (PSP) agréé.
        L'argent de tes ventes est conservé de façon sécurisée par Stripe — jamais par NOUT — jusqu'à ton retrait.
        En activant ton porte-monnaie, tu acceptes les conditions du PSP ainsi que le transfert de tes données au PSP.
        Une vérification d'identité (« Know Your Customer ») peut t'être demandée par Stripe avant le premier retrait.
      </p>
    </div>
  )
}
