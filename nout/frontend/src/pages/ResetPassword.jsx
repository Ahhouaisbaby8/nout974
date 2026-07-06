import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  // Le lien e-mail ouvre cette page avec une session de RÉCUPÉRATION (Supabase la pose automatiquement
  // en lisant le token dans l'URL → event PASSWORD_RECOVERY). On attend qu'elle soit établie avant
  // d'afficher le formulaire ; sans session, le lien est invalide ou expiré.
  const [checking, setChecking]   = useState(true)
  const [hasSession, setHasSession] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setHasSession(true); setChecking(false) }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setChecking(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')

    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/'), 1800)
    } catch {
      setError('Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré — redemande-en un.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-nout-turquoise border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-bold text-nout-dark mb-2">Lien invalide ou expiré</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Ce lien de réinitialisation n'est plus valable. Redemande un nouveau lien pour continuer.
          </p>
          <Link to="/mot-de-passe-oublie" className="btn-primary inline-block mt-6 px-8">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-bold text-nout-dark mb-2">Mot de passe mis à jour</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Ton nouveau mot de passe est enregistré. Tu es reconnecté, on te redirige…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">

        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-nout-primary">NOUT</Link>
          <p className="text-gray-500 text-sm mt-1">Choisis un nouveau mot de passe</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">
              Nouveau mot de passe <span className="text-gray-400 font-normal">(8 caractères min.)</span>
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full mt-1 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>

      </div>
    </div>
  )
}
