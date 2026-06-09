import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createListing, uploadListingImage } from '../services/listings'
import { compressImage } from '../utils/imageCompressor'
import { CATEGORIES, CONDITIONS } from '../utils/categories'
import { REUNION_CITIES } from '../utils/cities'
import BackButton from '../components/ui/BackButton'

const MAX_PHOTOS = 5

export default function CreateListing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [photos, setPhotos]       = useState([])   // { file, preview }
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState('')
  const [condition, setCondition] = useState('')
  const [price, setPrice]         = useState('')
  const [city, setCity]           = useState('')
  const [size, setSize]           = useState('')
  const [material, setMaterial]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const SIZES_VETEMENTS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const SIZES_CHAUSSURES = ['36', '37', '38', '39', '40', '41', '42', '43', '44']

  const generateDescription = async () => {
    if (!title.trim()) return setError('Remplis le titre avant de générer une description.')
    setError('')
    setAiLoading(true)
    try {
      const res = await fetch('/.netlify/functions/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: title, categorie: category, taille: size, composition: material }),
      })
      const data = await res.json()
      if (data.description) setDesc(data.description)
      else setError("La génération a échoué. Réessaie.")
    } catch {
      setError("Impossible de contacter l'assistant IA.")
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    return () => photos.forEach(p => URL.revokeObjectURL(p.preview))
  }, [])

  const handleFiles = (files) => {
    const selected = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    const newPhotos = selected.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...newPhotos].slice(0, MAX_PHOTOS))
  }

  const removePhoto = (index) => {
    const removed = photos[index]
    if (removed?.preview) URL.revokeObjectURL(removed.preview)
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (photos.length === 0) return setError('Ajoute au moins une photo.')
    if (!title.trim())       return setError('Le titre est obligatoire.')
    if (!category)           return setError('Choisis une catégorie.')
    if (!condition)          return setError("Précise l'état de l'article.")
    if (!price || Number(price) < 0) return setError('Indique un prix valide.')
    if (!city)               return setError('Choisis ta ville.')

    setLoading(true)
    try {
      // Compression + upload des photos
      const imageUrls = await Promise.all(
        photos.map(async p => {
          const compressed = await compressImage(p.file)
          return uploadListingImage(compressed, user.id)
        })
      )

      const listing = await createListing({
        user_id:     user.id,
        title:       title.trim(),
        description: description.trim(),
        category,
        condition,
        price:       Number(price),
        city,
        images:      imageUrls,
        size:        size.trim() || null,
        material:    material.trim() || null,
      })

      navigate(`/annonce/${listing.id}`)
    } catch (err) {
      setError("Une erreur est survenue. Vérifie ta connexion et réessaie.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BackButton />

      <h1 className="text-2xl font-extrabold text-nout-dark mb-6 mt-4">
        Publier une annonce
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* ── PHOTOS ── */}
        <section className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold text-nout-dark mb-1">Photos</h2>
          <p className="text-xs text-gray-400 mb-4">
            Jusqu'à {MAX_PHOTOS} photos · La première sera la photo principale
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-nout-border group">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-nout-primary text-white text-[10px] text-center py-0.5">
                    Principale
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="aspect-square rounded-lg border-2 border-dashed border-nout-border hover:border-nout-primary flex flex-col items-center justify-center text-gray-400 hover:text-nout-primary transition-colors cursor-pointer"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs mt-1">Photo</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </section>

        {/* ── INFOS ── */}
        <section className="bg-white rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-bold text-nout-dark">Informations</h2>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Titre de l'annonce</label>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Ex : iPhone 13 Pro Max 256 Go"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Description</label>
            <textarea
              rows={4}
              maxLength={1000}
              placeholder="Décris ton article : marque, état, raison de la vente..."
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              className="input-field resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <button
                type="button"
                onClick={generateDescription}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs font-medium text-[#1A3A8F] hover:text-[#0E7FAB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#1A3A8F] border-t-transparent rounded-full animate-spin" />
                    Génération en cours…
                  </>
                ) : (
                  <>✨ Générer une description avec l'IA</>
                )}
              </button>
              <p className="text-xs text-gray-400">{description.length}/1000</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-nout-dark mb-1">Catégorie</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field cursor-pointer"
              >
                <option value="">Choisir...</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-nout-dark mb-1">État</label>
              <select
                required
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="input-field cursor-pointer"
              >
                <option value="">Choisir...</option>
                {CONDITIONS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Taille */}
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">
              Taille <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            {category === 'vetements' ? (
              <select value={size} onChange={(e) => setSize(e.target.value)} className="input-field cursor-pointer">
                <option value="">Choisir une taille…</option>
                {SIZES_VETEMENTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : category === 'chaussures' ? (
              <select value={size} onChange={(e) => setSize(e.target.value)} className="input-field cursor-pointer">
                <option value="">Choisir une pointure…</option>
                {SIZES_CHAUSSURES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                type="text"
                maxLength={30}
                placeholder="Ex : 40x60 cm, 250 ml…"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="input-field"
              />
            )}
          </div>

          {/* Composition */}
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">
              Composition / Matière <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              maxLength={80}
              placeholder="Ex : 100% coton, Cuir synthétique…"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="input-field"
            />
          </div>

        </section>

        {/* ── PRIX & LIEU ── */}
        <section className="bg-white rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-bold text-nout-dark">Prix et localisation</h2>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Prix (€)</label>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-field pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Mets 0 € si tu offres l'article.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Ville</label>
            <select
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">Choisir ta ville...</option>
              {REUNION_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── SUBMIT ── */}
        <button
          type="submit"
          disabled={loading}
          className={`btn-primary w-full py-4 text-base ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Publication en cours…' : '🚀 Publier mon annonce'}
        </button>

      </form>
    </div>
  )
}
