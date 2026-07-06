import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()

  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      // On affiche toujours le même message de succès (même si l'e-mail n'existe pas) pour ne pas
      // révéler quels comptes existent (anti-énumération de comptes).
      setSent(true)
    } catch {
      // Idem : on n'expose pas l'erreur exacte. Seul un souci technique franc mérite un message.
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-bold text-nout-dark mb-2">Vérifie ta boîte mail</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Si un compte existe pour <strong>{email}</strong>, un e-mail contenant un lien de
            réinitialisation vient de t'être envoyé. Clique dessus pour choisir un nouveau mot de passe.
          </p>
          <p className="text-gray-400 text-xs mt-4">
            Pense à vérifier tes spams. Le lien est valable une heure.
          </p>
          <Link to="/connexion" className="btn-primary inline-block mt-6 px-8">
            Retour à la connexion
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
          <p className="text-gray-500 text-sm mt-1">Réinitialise ton mot de passe</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          Saisis l'adresse e-mail de ton compte. Nous t'enverrons un lien pour définir un nouveau
          mot de passe.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Adresse e-mail</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="ton@email.re"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full mt-1 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/connexion" className="text-nout-primary font-semibold hover:underline">
            Retour à la connexion
          </Link>
        </p>

      </div>
    </div>
  )
}
