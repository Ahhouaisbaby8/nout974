import { useState, useEffect } from 'react'
import { loadConnectAndInitialize } from '@stripe/connect-js'
import { ConnectComponentsProvider, ConnectAccountOnboarding } from '@stripe/react-connect-js'
import { supabase } from '../../services/supabase'

// Onboarding Stripe EMBARQUÉ : le formulaire de vérification s'affiche DANS NOUT (pas de redirection).
// Si quoi que ce soit échoue (clé manquante, session, chargement), on propose un repli vers la redirection
// classique (onFallback) — le flux qui marche déjà — pour ne jamais laisser le vendeur bloqué.
export default function StripeEmbeddedOnboarding({ onExit, onFallback }) {
  const [connectInstance, setConnectInstance] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    // Récupère une session de compte (client_secret + clé publique renvoyée par le serveur).
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/create-account-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur de session.')
      return data // { clientSecret, publishableKey }
    }

    ;(async () => {
      try {
        const first = await fetchSession()
        // Clé publique : d'abord la variable front (si définie), sinon celle renvoyée par le serveur.
        const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY || first.publishableKey
        if (!pk) throw new Error('Clé publique Stripe manquante (à configurer côté paiement).')

        let firstUsed = false
        const instance = loadConnectAndInitialize({
          publishableKey: pk,
          fetchClientSecret: async () => {
            if (!firstUsed) { firstUsed = true; return first.clientSecret }  // réutilise le 1er secret
            const again = await fetchSession()
            return again.clientSecret
          },
          appearance: { variables: { colorPrimary: '#0E8C82', borderRadius: '12px' } },
        })
        if (!cancelled) setConnectInstance(instance)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Impossible de charger la vérification.')
      }
    })()

    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
        <button type="button" onClick={onFallback} className="btn-primary px-6 py-3 text-sm">
          Continuer la vérification sur Stripe
        </button>
      </div>
    )
  }

  if (!connectInstance) {
    return <div className="text-sm text-gray-500 py-6">Chargement de la vérification…</div>
  }

  return (
    <div>
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectAccountOnboarding onExit={onExit} />
      </ConnectComponentsProvider>
      <button type="button" onClick={onFallback} className="text-xs text-gray-400 hover:underline mt-3">
        Un souci d'affichage ? Continuer sur Stripe (redirection)
      </button>
    </div>
  )
}
