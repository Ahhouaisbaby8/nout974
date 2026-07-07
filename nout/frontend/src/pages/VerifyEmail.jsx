import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import VerifyEmailBanner from '../components/VerifyEmailBanner'

// Cible du lien « Confirmer mon adresse » (e-mail de bienvenue / renvoi).
// Le token porte l'authentification : la page marche même déconnecté ou sur un autre appareil.
export default function VerifyEmail() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const uid   = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''

  // Lien incomplet (pas d'uid/token dans l'URL) → erreur d'emblée, sans passer par l'effet.
  const linkIncomplete = !uid || !token
  const [state, setState] = useState(linkIncomplete ? 'error' : 'checking')   // checking | success | error
  const [error, setError] = useState(linkIncomplete ? 'Lien de vérification incomplet.' : '')

  useEffect(() => {
    if (!uid || !token) return
    let cancelled = false
    fetch('/.netlify/functions/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && body?.ok) {
          setState('success')
        } else {
          setError(body?.error || 'Vérification impossible. Réessaie.')
          setState('error')
        }
      })
      .catch(() => {
        if (cancelled) return
        setError('Vérification impossible (connexion). Réessaie.')
        setState('error')
      })
    return () => { cancelled = true }
  }, [uid, token])

  return (
    <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
        <Link to="/" className="text-3xl font-extrabold text-nout-primary">NOUT</Link>

        {state === 'checking' && (
          <>
            <div className="w-8 h-8 border-2 border-nout-turquoise border-t-transparent rounded-full animate-spin mx-auto mt-8" />
            <p className="text-gray-500 text-sm mt-4">Vérification de ton adresse…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <h1 className="text-xl font-bold text-nout-dark mt-6 mb-2">Adresse vérifiée !</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              C'est tout bon : tu peux maintenant publier des annonces, écrire aux membres et acheter.
            </p>
            {/* Rechargement complet : le profil (email_verified_at) doit être relu par l'app. */}
            <a href={user ? '/' : '/connexion'} className="btn-primary inline-block mt-6 px-8">
              {user ? 'C\'est parti' : 'Se connecter'}
            </a>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-bold text-nout-dark mt-6 mb-2">Lien invalide ou expiré</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-5">{error}</p>
            {user ? (
              <div className="text-left">
                <VerifyEmailBanner context="continuer" />
              </div>
            ) : (
              <Link to="/connexion" className="btn-primary inline-block mt-2 px-8">
                Se connecter
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
