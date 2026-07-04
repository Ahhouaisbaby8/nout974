import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'

// « Mon argent » — le porte-monnaie vendeur.
// L'argent des ventes s'accumule dans le solde Stripe du vendeur (compte connecté, versement manuel) et
// n'est viré vers sa banque QUE quand il clique « Retirer ». Le solde affiché est lu chez Stripe (source
// de vérité) — NOUT ne détient jamais les fonds. La vérification d'identité (KYC) est exigée par Stripe
// avant tout retrait (obligation légale) : on la présente comme « vérifier pour retirer ».
export default function MyMoney() {
  const { user } = useAuth()
  const [params] = useSearchParams()

  const [state, setState]     = useState(null)   // { activated, payoutsEnabled, detailsSubmitted, available, pending }
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [connectLoading, setConnectLoading] = useState(false)
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

  // Retour depuis l'onboarding Stripe (?stripe=success|refresh) : on recharge le solde/statut.
  useEffect(() => {
    if (params.get('stripe')) {
      setToast(params.get('stripe') === 'success' ? 'Vérification enregistrée. Ton statut se met à jour.' : '')
      loadBalance()
    }
  }, [params, loadBalance])

  // Lance / poursuit l'onboarding Stripe (création du compte connecté au besoin) et redirige vers Stripe.
  const startVerification = async () => {
    if (connectLoading) return
    setError('')
    setConnectLoading(true)
    try {
      const res = await fetch('/.netlify/functions/create-connect-account', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Activation impossible. Réessaie.')
      window.location.href = data.url
    } catch (e) {
      setError(e.message)
      setConnectLoading(false)
    }
  }

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

          {/* Cas 1 — jamais activé : lancer la vérification */}
          {!state?.activated && (
            <div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Pour retirer tes gains, vérifie ton identité une seule fois (pièce d'identité + IBAN).
                Vérification sécurisée par Stripe (leader mondial du paiement) — ça te <strong>protège de la fraude</strong>, et <strong>pas de SIRET</strong> pour un particulier.
              </p>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed bg-[#F8FAFC] border border-[#E6EAF0] rounded-lg px-3 py-2">
                Stripe affichera « Entrepreneur individuel » : c'est juste le terme administratif pour un <strong>particulier</strong>. Aucune entreprise ni SIRET à créer — c'est normal.
              </p>
              <button
                type="button"
                onClick={startVerification}
                disabled={connectLoading}
                className="btn-primary px-6 py-3 text-sm disabled:opacity-60"
              >
                {connectLoading ? 'Redirection…' : 'Vérifier mon identité pour retirer'}
              </button>
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
              <button
                type="button"
                onClick={startVerification}
                disabled={connectLoading}
                className="btn-primary px-6 py-3 text-sm disabled:opacity-60"
              >
                {connectLoading ? 'Redirection…' : 'Terminer ma vérification'}
              </button>
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
                Le virement arrive sur ton compte sous 1 à 3 jours ouvrés. Tu peux modifier ton IBAN via « Vérifier mon identité ».
              </p>
              <button
                type="button"
                onClick={startVerification}
                disabled={connectLoading}
                className="text-sm text-[#0E8C82] font-medium hover:underline mt-2 disabled:opacity-60"
              >
                {connectLoading ? 'Redirection…' : 'Gérer mes informations bancaires'}
              </button>
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
