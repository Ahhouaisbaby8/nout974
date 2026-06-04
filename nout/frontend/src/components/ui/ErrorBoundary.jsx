import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-nout-secondary">
          <p className="text-6xl mb-4">😕</p>
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
