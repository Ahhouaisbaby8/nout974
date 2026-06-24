import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">

      {/* Icône + titre */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-[#0A0F2C] flex items-center justify-center mb-5 shadow-lg">
          <svg className="w-10 h-10 text-[#00C4B4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-nout-dark mb-3">Installer NOUT</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
          Ajoutez NOUT à votre écran d'accueil pour un accès rapide et des notifications en temps réel.
        </p>
      </div>

      {/* Bouton installation PWA natif */}
      {installed ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-center mb-8">
          <p className="text-green-700 font-semibold text-sm">NOUT est installé sur votre appareil !</p>
        </div>
      ) : deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="w-full py-4 rounded-xl bg-[#007A6E] text-white font-bold text-base hover:bg-[#006B61] transition-colors mb-8 shadow-md"
        >
          Installer l'application
        </button>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-center mb-8">
          <p className="text-gray-500 text-sm">
            Suivez les instructions ci-dessous pour installer NOUT sur votre appareil.
          </p>
        </div>
      )}

      {/* Instructions manuelles */}
      <div className="flex flex-col gap-4">

        {/* iPhone / iPad */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl"></span>
            <h2 className="font-bold text-nout-dark text-sm">iPhone / iPad</h2>
          </div>
          <ol className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">1.</span>
              Ouvrez cette page dans <strong>Safari</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">2.</span>
              Appuyez sur l'icône <strong>↑ Partager</strong> en bas de l'écran
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">3.</span>
              Sélectionnez <strong>"Sur l'écran d'accueil"</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">4.</span>
              Confirmez en appuyant sur <strong>"Ajouter"</strong>
            </li>
          </ol>
        </div>

        {/* Android */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl"></span>
            <h2 className="font-bold text-nout-dark text-sm">Android</h2>
          </div>
          <ol className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">1.</span>
              Ouvrez cette page dans <strong>Chrome</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">2.</span>
              Appuyez sur le menu <strong>⋮</strong> en haut à droite
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">3.</span>
              Sélectionnez <strong>"Installer l'application"</strong>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#007A6E] flex-shrink-0">4.</span>
              Confirmez en appuyant sur <strong>"Installer"</strong>
            </li>
          </ol>
        </div>

      </div>

      {/* Avantages */}
      <div className="mt-8 bg-[#0A0F2C] rounded-xl p-5">
        <h3 className="text-white font-bold text-sm mb-3">Pourquoi installer l'app ?</h3>
        <ul className="space-y-2 text-sm text-white/70">
          <li className="flex gap-2"><span className="text-[#00C4B4]"></span> Accès en un tap depuis l'écran d'accueil</li>
          <li className="flex gap-2"><span className="text-[#00C4B4]"></span> Notifications pour vos messages et commandes</li>
          <li className="flex gap-2"><span className="text-[#00C4B4]"></span> Interface plein écran sans barre du navigateur</li>
          <li className="flex gap-2"><span className="text-[#00C4B4]"></span> Chargement plus rapide</li>
        </ul>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        <Link to="/" className="hover:text-nout-turquoise transition-colors">← Retour à l'accueil</Link>
      </p>

    </div>
  )
}
