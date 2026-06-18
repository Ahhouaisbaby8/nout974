import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function CompteActive() {
  const navigate  = useNavigate()
  const [status, setStatus] = useState('loading') // loading | ok | error

  useEffect(() => {
    // Supabase JS v2 échange automatiquement le code de confirmation présent
    // dans l'URL (?code=...) lors du montage du composant via onAuthStateChange.
    // On attend simplement que la session soit établie.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('ok')
      } else if (event === 'SIGNED_OUT' || (!session && status !== 'loading')) {
        setStatus('error')
      }
    })

    // Fallback : si la session est déjà établie (clic rapide)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ok')
      else setTimeout(() => setStatus(s => s === 'loading' ? 'error' : s), 4000)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="text-gray-500 text-sm">Activation en cours…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-nout-dark mb-2">Lien invalide ou expiré</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Ce lien de confirmation a peut-être déjà été utilisé ou il a expiré.
            Essaie de te connecter directement, ou inscris-toi à nouveau.
          </p>
          <Link to="/connexion" className="btn-primary inline-block px-8">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-nout-dark mb-2">Ton compte est activé !</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Bienvenue sur NOUT — la marketplace 100&nbsp;% réunionnaise.<br />
          Tu peux maintenant acheter et vendre librement.
        </p>
        <Link to="/" className="btn-primary inline-block px-8">
          Découvrir NOUT
        </Link>
      </div>
    </div>
  )
}
