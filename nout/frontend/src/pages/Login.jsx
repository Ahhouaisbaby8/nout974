import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/'
  const redirect = rawRedirect.startsWith('/') ? rawRedirect : '/'

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [banMessage, setBanMessage] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('nout_ban')) {
      setBanMessage('Votre compte a été suspendu. Contactez-nous à contact@nout.re si vous pensez qu\'il s\'agit d\'une erreur.')
      sessionStorage.removeItem('nout_ban')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      navigate(redirect)
    } catch (err) {
      if (err?.message?.toLowerCase().includes('email not confirmed')) {
        setError('Ton adresse e-mail n\'est pas encore vérifiée. Consulte ta boîte mail et clique sur le lien de confirmation.')
      } else {
        setError('Email ou mot de passe incorrect.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    try {
      if (redirect !== '/') sessionStorage.setItem('nout_auth_redirect', redirect)
      await loginWithGoogle()
    } catch {
      setError('Impossible de se connecter avec Google.')
    }
  }

  return (
    <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">

        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-nout-primary">NOUT</Link>
          <p className="text-gray-500 text-sm mt-1">Connecte-toi à ton compte</p>
        </div>

        {banMessage && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-lg px-4 py-3 mb-5">
            {banMessage}
          </div>
        )}

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
            <label className="block text-sm font-medium text-nout-dark mb-1">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full mt-1 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="text-nout-primary font-semibold hover:underline">
            S'inscrire gratuitement
          </Link>
        </p>

      </div>
    </div>
  )
}
