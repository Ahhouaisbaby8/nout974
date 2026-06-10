import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })
  const canvas = document.createElement('canvas')
  canvas.width  = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  )
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}

export default function CropModal({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop]                       = useState({ x: 0, y: 0 })
  const [zoom, setZoom]                       = useState(1)
  const [croppedAreaPixels, setCroppedPixels] = useState(null)
  const [loading, setLoading]                 = useState(false)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setLoading(true)
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
    setLoading(false)
    onConfirm(blob)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      {/* overflow-y-auto permet le scroll si la modal est plus haute que le viewport (paysage mobile) */}
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden overflow-y-auto" style={{ maxHeight: '95dvh' }}>

        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-[#1A1A2E]">Recadrer la photo</h2>
          <p className="text-xs text-gray-400 mt-0.5">Format carré — glisse et zoome pour ajuster</p>
        </div>

        {/* Hauteur responsive : 320px max, réduit automatiquement sur mobile paysage */}
        <div className="relative w-full bg-black overflow-hidden" style={{ height: 'min(320px, calc(100dvh - 220px))' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4">
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
              {loading ? 'Recadrage…' : 'Recadrer ✓'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
