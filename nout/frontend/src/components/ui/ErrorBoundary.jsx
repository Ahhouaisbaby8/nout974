import { Component } from 'react'

// Filet de sécurité applicatif. Le cas n°1 (chunk périmé après déploiement : un import() de route lazy
// renvoie 404) est désormais géré EN AMONT par le wrapper `lazy` de App.jsx, qui recharge de façon bornée
// (compteur réarmé uniquement sur import réussi → aucune boucle possible). Cet ErrorBoundary ne fait donc
// plus d'auto-rechargement (l'ancien timer de reset par horloge pouvait, sur échec lent, boucler) : il se
// contente de JOURNALISER l'erreur réelle et de proposer un rechargement MANUEL.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Journaliser l'erreur RÉELLE (avant, elle était avalée silencieusement → bug indiagnosticable).
    try { console.error('[ErrorBoundary]', error, info?.componentStack) } catch { /* noop */ }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-nout-secondary">
          <p className="text-6xl mb-4"></p>
          <h1 className="text-2xl font-extrabold text-nout-dark mb-2">Quelque chose s'est mal passé</h1>
          <p className="text-gray-500 mb-6">Une erreur inattendue s'est produite. Rafraîchis la page pour réessayer.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-8 py-3"
          >
            Rafraîchir la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
