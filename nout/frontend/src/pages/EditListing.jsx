import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { containsForbiddenWord } from '../utils/forbiddenWords'
import { stripEmoji } from '../utils/stripEmoji'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getListingById, updateListing, uploadListingImage } from '../services/listings'
import { compressImage } from '../utils/imageCompressor'
import { CONDITIONS, BRANDS, sizeLabel } from '../utils/categories'
import CategoryPicker from '../components/ui/CategoryPicker'
import ColorPicker from '../components/ui/ColorPicker'
import SizeGuideModal from '../components/ui/SizeGuideModal'
import { REUNION_CITIES } from '../utils/cities'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'

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
const CLOTHING_CATS  = ['vetements-femme', 'vetements-homme', 'vetements-enfant', 'vetements-mixte', 'chaussures']
const FASHION_CATS   = [...CLOTHING_CATS, 'accessoires', 'sacs']
const SIZES_VETEMENTS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Unique']
const SIZES_CHAUSSURES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
const SIZES_ENFANT     = ['3 mois', '6 mois', '9 mois', '12 mois', '18 mois', '2 ans', '3 ans', '4 ans', '5 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans']

export default function EditListing() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const [photos, setPhotos]       = useState([])
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [condition, setCondition] = useState('')
  const [price, setPrice]         = useState('')
  const [city, setCity]           = useState('')
  const [size, setSize]           = useState('')
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [material, setMaterial]   = useState('')
  const [brandSelect, setBrandSelect] = useState('')
  const [brandCustom, setBrandCustom] = useState('')
  const [colors, setColors]       = useState([])   // jusqu'à 2 couleurs

  const isClothing = CLOTHING_CATS.includes(category)
  const isFashion  = FASHION_CATS.includes(category)
  const sizeOptions = category === 'chaussures' ? SIZES_CHAUSSURES
    : category === 'vetements-enfant' ? SIZES_ENFANT
    : (category === 'accessoires' || category === 'sacs') ? ['Taille unique']
    : SIZES_VETEMENTS
  const sizePlaceholder = category === 'chaussures' ? 'Pointure' : 'Taille'

  useEffect(() => {
    getListingById(id)
      .then(listing => {
        if (listing.user_id !== user.id) {
          navigate(`/annonce/${id}`)
          return
        }
        setTitle(listing.title)
        setDesc(listing.description ?? '')
        setCategory(listing.category)
        setSubcategory(listing.subcategory ?? '')
        setCondition(listing.condition)
        setPrice(String(listing.price))
        setCity(listing.city)
        setSize(listing.size ?? '')
        setMaterial(listing.material ?? '')
        const existingBrand = listing.brand ?? ''
        if (existingBrand && BRANDS.includes(existingBrand)) {
          setBrandSelect(existingBrand)
          setBrandCustom('')
        } else if (existingBrand) {
          setBrandSelect('__autre__')
          setBrandCustom(existingBrand)
        } else {
          setBrandSelect('')
          setBrandCustom('')
        }
        setColors(listing.colors ?? (listing.color ? [listing.color] : []))
        setPhotos(listing.images?.map(url => ({ url })) ?? [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, user.id, navigate])

  const handleFiles = (files) => {
    const selected = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    const newPhotos = selected.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setPhotos(prev => [...prev, ...newPhotos].slice(0, MAX_PHOTOS))
  }

  const removePhoto = (index) => {
    const removed = photos[index]
    if (removed?.preview) URL.revokeObjectURL(removed.preview)
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const clean = (str) => stripEmoji(DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }))

    if (photos.length === 0)        return setError('Garde au moins une photo.')
    if (!title.trim())              return setError('Le titre est obligatoire.')
    if (!category)                  return setError('Choisis une catégorie.')
    if (category !== 'beaute' && !condition) return setError("Précise l'état de l'article.")
    if (isClothing && !size)        return setError('Indique la taille.')
    if (!price || Number(price) < 0) return setError('Indique un prix valide.')
    if (Number(price) > 50000)      return setError('Le prix maximum est 50 000 €.')
    if (!city)                      return setError('Choisis ta ville.')

    const finalBrand = brandSelect === '__autre__' ? brandCustom.trim() : brandSelect
    const wordCheck = containsForbiddenWord([title, description, material, finalBrand].join(' '))
    if (wordCheck.found) return setError(`Contenu non autorisé sur NOUT. Retire le terme "${wordCheck.word}" pour publier.`)

    setSaving(true)
    try {
      const uploadTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé. Vérifie ta connexion et réessaie.')), 45_000)
      )
      const imageUrls = await Promise.race([
        Promise.all(
          photos.map(async p => {
            if (!p.file) return p.url
            const compressed = await compressImage(p.file)
            return uploadListingImage(compressed, user.id)
          })
        ),
        uploadTimeout,
      ])

      await updateListing(id, {
        title:       clean(title.trim()),
        description: clean(description.trim()),
        category,
        subcategory: subcategory || null,
        condition:   condition || null,
        price:       Number(price),
        city,
        images:      imageUrls,
        size:        isFashion ? (size || null) : null,
        material:    isFashion ? (clean(material.trim()) || null) : null,
        brand:       isFashion ? (clean(finalBrand) || null) : null,
        color:       isFashion ? (colors[0] ?? null) : null,
        colors:      isFashion ? colors : [],
      })

      navigate(`/annonce/${id}`)
    } catch (err) {
      console.error('EditListing error:', err)
      setError(traduireErreur(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  if (notFound) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-5xl mb-4"></p>
      <p className="text-lg font-semibold text-nout-dark">Annonce introuvable</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Retour à l'accueil</button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BackButton />
      <SizeGuideModal open={showSizeGuide} onClose={() => setShowSizeGuide(false)} />

      <h1 className="text-2xl font-extrabold text-nout-dark mb-6 mt-4">
        Modifier l'annonce
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
            {photos.map((p, i) => {
              const src = p.preview ?? p.url
              return (
                <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-nout-border group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-nout-primary text-white text-[10px] text-center py-0.5">
                      Principale
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    aria-label="Supprimer cette photo"
                  >
                    
                  </button>
                </div>
              )
            })}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="aspect-[3/4] rounded-lg border-2 border-dashed border-nout-border hover:border-nout-primary flex flex-col items-center justify-center text-gray-400 hover:text-nout-primary transition-colors cursor-pointer"
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
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              className="input-field resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/1000</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={category === 'beaute' ? 'col-span-2' : ''}>
              <label className="block text-sm font-medium text-nout-dark mb-1">Catégorie</label>
              {/* Sélecteur en cascade (rubrique → sous-rubrique), aligné sur le formulaire Vendre. */}
              <CategoryPicker
                category={category}
                subcategory={subcategory}
                onSelect={({ category: cat, subcategory: sub }) => { setCategory(cat); setSubcategory(sub) }}
              />
            </div>

            {category !== 'beaute' && (
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
            )}
          </div>
        </section>

        {/* ── DÉTAILS VÊTEMENT / CHAUSSURE / ACCESSOIRE ── */}
        {isFashion && (
          <section className="bg-white rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <h2 className="font-bold text-nout-dark">
              {category === 'chaussures' ? 'Détails chaussure'
               : (category === 'accessoires' || category === 'sacs') ? 'Détails article'
               : 'Détails vêtement'}
            </h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-nout-dark">
                  {sizePlaceholder}{isClothing && <span className="text-red-500"> *</span>}
                </label>
                {(category === 'vetements-femme' || category === 'vetements-homme') && (
                  <button type="button" onClick={() => setShowSizeGuide(true)} className="text-xs font-medium text-[#0E7FAB] hover:underline">
                    Guide des tailles
                  </button>
                )}
              </div>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="input-field cursor-pointer"
              >
                <option value="">Choisir {sizePlaceholder.toLowerCase()}…</option>
                {sizeOptions.map(s => <option key={s} value={s}>{sizeLabel(s)}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-nout-dark mb-1">
                Marque <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <select
                value={brandSelect}
                onChange={(e) => { setBrandSelect(e.target.value); if (e.target.value !== '__autre__') setBrandCustom('') }}
                className="input-field cursor-pointer"
              >
                <option value="">Choisir une marque…</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="__autre__">Autre</option>
              </select>
              {brandSelect === '__autre__' && (
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Saisir la marque…"
                  value={brandCustom}
                  onChange={(e) => setBrandCustom(e.target.value)}
                  className="input-field mt-2"
                />
              )}
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
              <label className="block text-sm font-medium text-nout-dark mb-2">
                Couleur <span className="text-gray-400 font-normal">(optionnel · 2 max)</span>
              </label>
              <ColorPicker value={colors} onChange={setColors} max={2} />
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-field pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            </div>
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
          disabled={saving}
          className={`btn-primary w-full py-4 text-base ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>

      </form>
    </div>
  )
}
