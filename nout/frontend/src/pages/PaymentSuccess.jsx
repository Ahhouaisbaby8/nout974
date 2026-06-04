import { useSearchParams, Link } from 'react-router-dom'

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const orderId  = params.get('commande')

  return (
    <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-extrabold text-nout-dark mb-2">Paiement réussi !</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Ton paiement a bien été effectué. Le vendeur a été notifié et va te contacter pour organiser la remise de l'article.
        </p>

        <div className="bg-nout-secondary rounded-xl p-4 text-left mb-6">
          <p className="text-xs text-gray-400 mb-1">Numéro de commande</p>
          <p className="text-sm font-mono text-nout-dark break-all">{orderId ?? '—'}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/commandes" className="btn-primary w-full text-center">
            Voir mes commandes
          </Link>
          <Link to="/" className="text-sm text-nout-primary hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
