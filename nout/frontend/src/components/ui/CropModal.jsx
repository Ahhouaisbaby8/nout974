import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })
  // Limite la résolution à 1200px pour éviter les crashes mémoire sur mobile (iOS/Android)
  const MAX_SIDE = 1200
  const scale = Math.min(1, MAX_SIDE / pixelCrop.width, MAX_SIDE / pixelCrop.height)
  const outW = Math.round(pixelCrop.width * scale)
  const outH = Math.round(pixelCrop.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width  = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outW, outH
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Recadrage impossible. Essaie une autre photo.')); return }
      resolve(blob)
    }, 'image/jpeg', 0.88)
  })
}

export default function CropModal({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop]                       = useState({ x: 0, y: 0 })
  const [zoom, setZoom]                       = useState(1)
  const [croppedAreaPixels, setCroppedPixels] = useState(null)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')
  // Format du cadre : portrait 3:4 par défaut (façon Vinted → la photo verticale entière tient)
  // ou carré 1:1. Le vendeur peut toujours zoomer/déplacer pour recadrer dans le format choisi.
  const [aspect, setAspect]                   = useState(3 / 4)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setLoading(true)
    setError('')
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onConfirm(blob)
    } catch (err) {
      setError(err.message || 'Recadrage impossible. Essaie une autre photo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      {/* overflow-y-auto seul (pas overflow-hidden en même temps, qui se battaient sur l'axe Y) :
          garantit le scroll jusqu'aux boutons Annuler/Recadrer même si la modal dépasse le viewport
          (petit écran / paysage mobile). Le rounded-2xl reste net car le contenu ne déborde pas. */}
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-y-auto" style={{ maxHeight: '95dvh' }}>

        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-[#1A1A2E]">Recadrer la photo</h2>
          <p className="text-xs text-gray-400 mt-0.5">Choisis le format, puis glisse et zoome pour ajuster</p>
        </div>

        {/* Hauteur responsive : un peu plus haute pour laisser respirer le format portrait */}
        <div className="relative w-full bg-black overflow-hidden" style={{ height: 'min(380px, calc(100dvh - 240px))' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4">
          {/* Choix du format — portrait (photo verticale entière) ou carré */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'portrait', label: 'Portrait', ratio: 3 / 4 },
              { id: 'carre',    label: 'Carré',    ratio: 1 },
            ].map(({ id, label, ratio }) => {
              const active = aspect === ratio
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAspect(ratio)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? 'border-[#00C4B4] bg-[#00C4B4]/10 text-[#0E7FAB]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gray-400">−</span>
            <input
              type="range"
              min={1} max={3} step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#00C4B4] h-1.5 cursor-pointer"
            />
            <span className="text-xs text-gray-400">+</span>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #0E7FAB, #00C4B4)' }}
            >
              {loading ? 'Recadrage…' : 'Recadrer '}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
