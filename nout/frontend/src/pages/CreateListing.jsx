import { useState, useRef, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { containsForbiddenWord } from '../utils/forbiddenWords'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createListing, uploadListingImage } from '../services/listings'
import { compressImage } from '../utils/imageCompressor'
import { CATEGORIES, CONDITIONS } from '../utils/categories'
import { REUNION_CITIES } from '../utils/cities'
import BackButton from '../components/ui/BackButton'
import CropModal from '../components/ui/CropModal'

const traduireErreur = (error) => {
  if (!error) return 'Une erreur est survenue.'
  const msg = (error.message || error.toString()).toLowerCase()
  if (msg.includes('listings_condition_check'))      return "L'état de l'article n'est pas valide."
  if (msg.includes('violates check constraint'))     return "Une valeur saisie n'est pas acceptée."
  if (msg.includes('violates not-null constraint'))  return 'Merci de remplir tous les champs obligatoires.'
  if (msg.includes('duplicate key'))                 return 'Cette annonce existe déjà.'
  if (msg.includes('jwt expired') || msg.includes('not authenticated')) return 'Session expirée, merci de te reconnecter.'
  if (msg.includes('storage') || msg.includes('upload') || msg.includes('délai')) return "Erreur lors de l'upload photo. Réessaie."
  return 'Une erreur est survenue. Réessaie.'
}

const MAX_PHOTOS = 5
const CLOTHING_CATS  = ['vetements-femme', 'vetements-homme', 'vetements-enfant', 'chaussures']
const FASHION_CATS   = [...CLOTHING_CATS, 'accessoires', 'sacs']
const SIZES_VETEMENTS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Unique']
const SIZES_CHAUSSURES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
const SIZES_ENFANT     = ['3 mois', '6 mois', '9 mois', '12 mois', '18 mois', '2 ans', '3 ans', '4 ans', '5 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans']
const COLORS = ['Blanc', 'Noir', 'Gris', 'Beige', 'Marron', 'Rouge', 'Rose', 'Orange', 'Jaune', 'Vert', 'Bleu', 'Violet', 'Multicolore']

export default function CreateListing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [photos, setPhotos]       = useState([])
  const [cropQueue, setCropQueue] = useState([])
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState('')
  const [condition, setCondition] = useState('')
  const [price, setPrice]         = useState('')
  const [city, setCity]           = useState('')
  const [size, setSize]           = useState('')
  const [material, setMaterial]   = useState('')
  const [brand, setBrand]         = useState('')
  const [color, setColor]         = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const isClothing = CLOTHING_CATS.includes(category)
  const isFashion  = FASHION_CATS.includes(category)
  const sizeOptions = category === 'chaussures' ? SIZES_CHAUSSURES
    : category === 'vetements-enfant' ? SIZES_ENFANT
    : (category === 'accessoires' || category === 'sacs') ? ['Taille unique']
    : SIZES_VETEMENTS
  const sizePlaceholder = category === 'chaussures' ? 'Pointure' : 'Taille'

  useEffect(() => {
    return () => photos.forEach(p => URL.revokeObjectURL(p.preview))
  }, [])

  useEffect(() => {
    setSize('')
  }, [category])

  const handleFiles = (files) => {
    const selected = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    const items = selected.map(file => ({ file, src: URL.createObjectURL(file) }))
    setCropQueue(prev => [...prev, ...items])
  }

  const handleCropConfirm = (blob) => {
    const current = cropQueue[0]
    URL.revokeObjectURL(current.src)
    if (!blob) { setCropQueue(prev => prev.slice(1)); return }
    const preview = URL.createObjectURL(blob)
    setPhotos(prev => [...prev, { file: blob, preview }].slice(0, MAX_PHOTOS))
    setCropQueue(prev => prev.slice(1))
  }

  const handleCropCancel = () => {
    URL.revokeObjectURL(cropQueue[0].src)
    setCropQueue(prev => prev.slice(1))
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

    const clean = (str) => DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

    if (photos.length === 0)        return setError('Ajoute au moins une photo.')
    if (!title.trim())              return setError('Le titre est obligatoire.')
    if (!category)                  return setError('Choisis une catégorie.')
    if (!condition)                 return setError("Précise l'état de l'article.")
    if (isClothing && !size)        return setError('Indique la taille.')
    if (!price || Number(price) < 0) return setError('Indique un prix valide.')
    if (Number(price) > 50000)      return setError('Le prix maximum est 50 000 €.')
    if (!city)                      return setError('Choisis ta ville.')

    setLoading(true)
    try {
      const wordCheck = containsForbiddenWord([title, description, material, brand].join(' '))
      if (wordCheck.found) {
        setError(`Contenu non autorisé sur NOUT. Retire le terme "${wordCheck.word}" pour publier.`)
        return
      }

      const uploadTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé. Vérifie ta connexion et réessaie.')), 45_000)
      )
      const imageUrls = await Promise.race([
        Promise.all(
          photos.map(async p => {
            const compressed = await compressImage(p.file)
            return uploadListingImage(compressed, user.id)
          })
        ),
        uploadTimeout,
      ])

      const listing = await createListing({
        user_id:     user.id,
        title:       clean(title.trim()),
        description: clean(description.trim()),
        category,
        condition,
        price:       Number(price),
        city,
        images:      imageUrls,
        size:        isFashion ? (size || null) : null,
        material:    isFashion ? (clean(material.trim()) || null) : null,
        brand:       isFashion ? (clean(brand.trim()) || null) : null,
        color:       isFashion ? (color || null) : null,
      })

      navigate(`/annonce/${listing.id}`)
    } catch (err) {
      console.error('CreateListing error:', err)
      setError(traduireErreur(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    {cropQueue.length > 0 && (
      <CropModal
        imageSrc={cropQueue[0].src}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    )}
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
                  className="absolute top-1 right-1 w-7 h-7 bg-black/60 text-white rounded-full text-sm flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  aria-label="Supprimer cette photo"
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
            <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/1000</p>
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
        </section>

        {/* ── DÉTAILS VÊTEMENT / CHAUSSURE / ACCESSOIRE ── */}
        {isFashion && (
          <section className="bg-white rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <h2 className="font-bold text-nout-dark">
              {category === 'chaussures' ? '👟 Détails chaussure'
               : (category === 'accessoires' || category === 'sacs') ? '👜 Détails article'
               : '👗 Détails vêtement'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-nout-dark mb-1">
                {sizePlaceholder}{isClothing && <span className="text-red-500"> *</span>}
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="input-field cursor-pointer"
              >
                <option value="">Choisir {sizePlaceholder.toLowerCase()}…</option>
                {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-nout-dark mb-1">
                Marque <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                maxLength={50}
                placeholder="Ex : Nike, Zara, H&M…"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nout-dark mb-1">
                Matière <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                maxLength={80}
                placeholder="Ex : 100% coton, polyester…"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nout-dark mb-1">
                Couleur <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input-field cursor-pointer"
              >
                <option value="">Choisir une couleur…</option>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </section>
        )}

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
    </>
  )
}
