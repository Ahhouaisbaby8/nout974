import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-6xl mb-4">🔍</p>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-2">Page introuvable</h1>
      <p className="text-gray-400 text-sm mb-8">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="btn-primary px-8">Retour à l'accueil</Link>
    </div>
  )
}
