import { Component } from 'react'

// Détecte une erreur de chargement de CHUNK JS (import dynamique d'une page lazy qui échoue). Cause n°1 :
// après un déploiement, un onglet déjà ouvert référence un hash de chunk qui n'existe plus sur le serveur →
// `import()` renvoie 404 → l'app entière tombe dans ce boundary. Un simple rechargement récupère le nouveau
// index.html (avec les bons hash). C'est ce qui donnait « Quelque chose s'est mal passé » sur /compte (et
// n'importe quelle autre page) : il fallait rafraîchir à la main. On automatise ce rechargement.
function isChunkError(error) {
  const msg = String(error?.message || error || '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|dynamically imported module|ChunkLoadError|Loading chunk [\d]+ failed|Unable to preload CSS/i.test(msg)
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, isChunk: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunk: isChunkError(error) }
  }

  componentDidCatch(error, info) {
    // Journaliser l'erreur RÉELLE (avant, elle était avalée silencieusement → bug indiagnosticable).
    try { console.error('[ErrorBoundary]', error, info?.componentStack) } catch { /* noop */ }

    // Chunk périmé → recharger une fois pour récupérer le nouveau build. Garde anti-boucle : max 2
    // rechargements ; le compteur est réarmé (componentDidMount) si l'app tient ≥ 5 s après un reload.
    if (isChunkError(error)) {
      try {
        const n = Number(sessionStorage.getItem('nout_chunk_reloads') || 0)
        if (n < 2) {
          sessionStorage.setItem('nout_chunk_reloads', String(n + 1))
          window.location.reload()
        }
      } catch {
        window.location.reload()
      }
    }
  }

  componentDidMount() {
    // Si l'app démarre et tient 5 s sans replanter, le build est sain → on réarme le compteur de reload chunk
    // (sans ça, un reload de récupération réinitialiserait immédiatement le compteur = risque de boucle).
    this._resetTimer = setTimeout(() => {
      try { sessionStorage.removeItem('nout_chunk_reloads') } catch { /* noop */ }
    }, 5000)
  }

  componentWillUnmount() {
    clearTimeout(this._resetTimer)
  }

  render() {
    if (this.state.hasError) {
      // Erreur de chunk en cours de récupération : écran neutre (le reload arrive), pas la page d'erreur.
      if (this.state.isChunk) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-nout-secondary">
            <div className="w-8 h-8 border-2 border-nout-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )
      }
      // Vraie erreur applicative : on montre le message + bouton de rechargement.
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
