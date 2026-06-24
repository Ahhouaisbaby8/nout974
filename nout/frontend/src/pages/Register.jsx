import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')

    setLoading(true)
    try {
      await register({ email, password })
      setSuccess(true)
      // Email de bienvenue — non bloquant, silencieux si erreur
      fetch('/.netlify/functions/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => {})
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('Cette adresse e-mail est déjà utilisée.')
      } else {
        setError('Une erreur est survenue. Réessaie.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    try {
      await loginWithGoogle()
    } catch {
      setError('Impossible de se connecter avec Google.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
          <div className="text-5xl mb-4">📩</div>
          <h2 className="text-xl font-bold text-nout-dark mb-2">Vérifie ta boîte mail !</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Un e-mail de confirmation a été envoyé à <strong>{email}</strong>.<br />
            Clique sur le lien pour activer ton compte.
          </p>
          <Link to="/connexion" className="btn-primary inline-block mt-6 px-8">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">

        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-nout-primary">NOUT</Link>
          <p className="text-gray-500 text-sm mt-1">Crée ton compte gratuitement</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* Bouton Google */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 border-2 border-nout-border rounded-nout py-3 text-sm font-semibold text-nout-dark hover:border-nout-primary hover:bg-[#EAF6F5] transition-all mb-5"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <hr className="flex-1 border-nout-border" />
          <span className="text-xs text-gray-400">ou</span>
          <hr className="flex-1 border-nout-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Adresse e-mail</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="email"
              placeholder="ton@email.re"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">
              Mot de passe <span className="text-gray-400 font-normal">(8 caractères min.)</span>
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

          <p className="text-xs text-gray-400 leading-relaxed">
            En t'inscrivant, tu acceptes nos{' '}
            <Link to="/legal/cgu" className="text-nout-primary hover:underline">CGU</Link>{' '}
            et notre{' '}
            <Link to="/legal/confidentialite" className="text-nout-primary hover:underline">politique de confidentialité</Link>.
          </p>

          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full mt-1 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Création du compte…' : "S'inscrire gratuitement"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="text-nout-primary font-semibold hover:underline">
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  )
}
