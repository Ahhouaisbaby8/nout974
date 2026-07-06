import { useState, useRef, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { containsForbiddenWord } from '../utils/forbiddenWords'
import { stripEmoji } from '../utils/stripEmoji'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createListing, uploadListingImage } from '../services/listings'
import { supabase } from '../services/supabase'
import { compressImage } from '../utils/imageCompressor'
import { CONDITIONS, BRANDS, MATERIALS, sizeLabel } from '../utils/categories'
import { REUNION_CITIES } from '../utils/cities'
import { computeSellerPayout } from '../utils/shipping'
import { describeListing } from '../utils/describeListing'
import { formatPrice } from '../utils/formatters'
import BackButton from '../components/ui/BackButton'
import CropModal from '../components/ui/CropModal'
import CategoryPicker from '../components/ui/CategoryPicker'
import ColorPicker from '../components/ui/ColorPicker'
import SizeGuideModal from '../components/ui/SizeGuideModal'
import { Sparkles } from 'lucide-react'

// Phrases-types pour aider à rédiger la description (un clic = ajout)
const DESC_TEMPLATES = [
  'Très bon état, porté quelques fois',
  'Jamais porté, comme neuf',
  'Petite trace d\'usure (voir photos)',
  'Vendu pour cause de tri',
  'Taille un peu petit / grand',
  'Provient d\'un intérieur non-fumeur',
  'Remise en main propre possible',
]

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

export default function CreateListing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const titleRef = useRef(null)
  // Refs des champs obligatoires — pour surligner en rouge + faire défiler jusqu'au 1er champ manquant.
  const photosRef   = useRef(null)
  const categoryRef = useRef(null)
  const conditionRef = useRef(null)
  const sizeRef     = useRef(null)
  const priceRef    = useRef(null)
  const cityRef     = useRef(null)
  // Champ actuellement en erreur ('photos' | 'title' | 'category' | 'condition' | 'size' | 'price' | 'city' | '')
  const [errorField, setErrorField] = useState('')

  const [photos, setPhotos]       = useState([])
  const [cropQueue, setCropQueue] = useState([])
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [condition, setCondition] = useState('')
  const [price, setPrice]         = useState('')
  const [city, setCity]           = useState('')
  const [size, setSize]           = useState('')
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [materialSelect, setMaterialSelect] = useState('')
  const [materialCustom, setMaterialCustom] = useState('')
  const [brandSelect, setBrandSelect] = useState('')
  const [brandCustom, setBrandCustom] = useState('')
  const [colors, setColors]       = useState([])   // jusqu'à 2 couleurs
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const isClothing = CLOTHING_CATS.includes(category)
  const isFashion  = FASHION_CATS.includes(category)
  const sizeOptions = category === 'chaussures' ? SIZES_CHAUSSURES
    : category === 'vetements-enfant' ? SIZES_ENFANT
    : (category === 'accessoires' || category === 'sacs') ? ['Taille unique']
    : SIZES_VETEMENTS
  const sizePlaceholder = category === 'chaussures' ? 'Pointure' : 'Taille'

  // Valeurs finales (gèrent le cas "Autre")
  const finalBrand    = brandSelect    === '__autre__' ? brandCustom    : brandSelect
  const finalMaterial = materialSelect === '__autre__' ? materialCustom : materialSelect

  // Assez d'infos pour proposer une rédaction automatique ?
  const canGenerate = Boolean(category && (finalBrand || colors[0] || size || finalMaterial))

  // Génère titre + description à partir des attributs saisis (sans IA, instantané)
  const handleGenerate = () => {
    const { title: t, description: d } = describeListing({
      brand: finalBrand, category, subcategory, size, color: colors.join(' et ') || undefined,
      material: finalMaterial, condition, city,
    })
    if (t) setTitle(t)
    if (d) setDesc(d)
    // Le titre/description sont plus haut dans le formulaire → on y remonte pour que le vendeur
    // voie le texte généré et puisse l'ajuster.
    requestAnimationFrame(() => titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  useEffect(() => {
    return () => photos.forEach(p => URL.revokeObjectURL(p.preview))
  }, [])

  useEffect(() => {
    // La sous-catégorie n'est PAS remise à zéro ici : le CategoryPicker pose toujours la paire
    // (catégorie + sous-catégorie) de façon cohérente et atomique.
    setSize('')
    if (category === 'beaute') setCondition('')
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
    if (errorField === 'photos') setErrorField('')
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

  // Refs par champ, pour faire défiler jusqu'au champ fautif.
  const fieldRefs = {
    photos: photosRef, title: titleRef, category: categoryRef,
    condition: conditionRef, size: sizeRef, price: priceRef, city: cityRef,
  }

  // Signale une erreur SUR un champ précis : message + surlignage rouge + défilement vers le champ.
  const failField = (field, message) => {
    setError(message)
    setErrorField(field)
    const el = fieldRefs[field]?.current
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrorField('')

    const clean = (str) => stripEmoji(DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }))

    if (photos.length === 0)        return failField('photos', 'Ajoute au moins une photo.')
    if (!title.trim())              return failField('title', 'Le titre est obligatoire.')
    if (!category)                  return failField('category', 'Choisis une catégorie.')
    if (category !== 'beaute' && !condition) return failField('condition', "Précise l'état de l'article.")
    if (isClothing && !size)        return failField('size', 'Indique la taille.')
    if (!price || Number(price) < 0) return failField('price', 'Indique un prix valide.')
    if (Number(price) > 0 && Number(price) < 1) return failField('price', 'Le prix minimum est 1 € (ou 0 € pour offrir l\'article).')
    if (Number(price) > 50000)      return failField('price', 'Le prix maximum est 50 000 €.')
    if (!city)                      return failField('city', 'Choisis ta ville.')

    setLoading(true)
    try {
      const wordCheck = containsForbiddenWord([title, description, finalMaterial, finalBrand].join(' '))
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
        subcategory: subcategory || null,
        condition:   condition || null,
        price:       Number(price),
        city,
        images:      imageUrls,
        size:        isFashion ? (size || null) : null,
        material:    isFashion ? (clean(finalMaterial.trim()) || null) : null,
        brand:       isFashion ? (clean(finalBrand.trim()) || null) : null,
        color:       isFashion ? (colors[0] ?? null) : null,
        colors:      isFashion ? colors : [],
      })

      // Vérification éligibilité fondateur en arrière-plan (ne bloque pas la navigation)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          fetch('/.netlify/functions/check-founder-eligibility', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {})
        }
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
    <SizeGuideModal open={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
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
        <section
          ref={photosRef}
          className={`bg-white rounded-xl p-5 shadow-sm transition-colors ${errorField === 'photos' ? 'ring-2 ring-red-400' : ''}`}
        >
          <h2 className="font-bold text-nout-dark mb-1">Photos</h2>
          <p className="text-xs text-gray-400 mb-4">
            Jusqu'à {MAX_PHOTOS} photos · La première sera la photo principale
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-nout-border group">
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
                  
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-nout-dark">Informations</h2>
            <span className="text-[11px] text-gray-400">Astuce : « Rédiger » est en bas du formulaire</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-nout-dark">Titre de l'annonce</label>
            </div>
            <input
              type="text"
              ref={titleRef}
              required
              maxLength={80}
              placeholder="Ex : Robe Zara fleurie, taille M"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (errorField === 'title') setErrorField('') }}
              className={`input-field ${errorField === 'title' ? 'border-red-400 ring-2 ring-red-200' : ''}`}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Description</label>
            {/* Phrases-types à ajouter en un clic (inspiré Vinted/Depop) */}
            {DESC_TEMPLATES.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DESC_TEMPLATES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDesc(d => d.includes(t) ? d : (d ? `${d}\n${t}` : t))}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[#D6E0F5] text-nout-dark hover:border-[#00C4B4] hover:bg-[#00C4B4]/5 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
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

          <div className="flex flex-col gap-4">
            <div
              ref={categoryRef}
              className={errorField === 'category' ? 'rounded-xl ring-2 ring-red-400 p-2 -m-2' : ''}
            >
              <label className="block text-sm font-medium text-nout-dark mb-2">Catégorie</label>
              {/* Sélecteur en cascade (rubrique → sous-rubrique), remplace les chips à plat. */}
              <CategoryPicker
                category={category}
                subcategory={subcategory}
                onSelect={({ category: cat, subcategory: sub }) => { setCategory(cat); setSubcategory(sub); if (errorField === 'category') setErrorField('') }}
              />
            </div>

            {category !== 'beaute' && (
              <div
                ref={conditionRef}
                className={errorField === 'condition' ? 'rounded-xl ring-2 ring-red-400 p-2 -m-2' : ''}
              >
                <label className="block text-sm font-medium text-nout-dark mb-2">État</label>
                <div className="flex flex-col gap-2">
                  {CONDITIONS.map(c => {
                    const active = condition === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCondition(active ? '' : c.id); if (errorField === 'condition') setErrorField('') }}
                        aria-pressed={active}
                        className={`text-left rounded-xl border-2 px-4 py-3 transition-all
                          ${active ? 'border-[#1A3A8F] bg-[#F5F8FF]' : 'border-[#D6E0F5] bg-white hover:border-[#00C4B4]'}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-nout-dark">{c.label}</span>
                          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${active ? 'border-[#1A3A8F] bg-[#1A3A8F]' : 'border-gray-300 bg-white'}`} />
                        </span>
                        {c.desc && <span className="block text-xs text-gray-500 mt-1 leading-snug">{c.desc}</span>}
                      </button>
                    )
                  })}
                </div>
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
                ref={sizeRef}
                value={size}
                onChange={(e) => { setSize(e.target.value); if (errorField === 'size') setErrorField('') }}
                className={`input-field cursor-pointer ${errorField === 'size' ? 'border-red-400 ring-2 ring-red-200' : ''}`}
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
              <select
                value={materialSelect}
                onChange={(e) => { setMaterialSelect(e.target.value); if (e.target.value !== '__autre__') setMaterialCustom('') }}
                className="input-field cursor-pointer"
              >
                <option value="">Choisir une matière…</option>
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__autre__">Autre</option>
              </select>
              {materialSelect === '__autre__' && (
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Ex : 100% coton, mélange…"
                  value={materialCustom}
                  onChange={(e) => setMaterialCustom(e.target.value)}
                  className="input-field mt-2"
                />
              )}
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
                ref={priceRef}
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => { setPrice(e.target.value); if (errorField === 'price') setErrorField('') }}
                className={`input-field pr-10 ${errorField === 'price' ? 'border-red-400 ring-2 ring-red-200' : ''}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Prix minimum 1 €. Mets 0 € si tu l'offres (remise en main propre, sans paiement en ligne).</p>

            {/* Le vendeur reçoit son prix EN ENTIER — les frais (protection) sont payés par l'acheteur */}
            {Number(price) > 0 && (
              <div className="mt-3 rounded-xl border border-[#B9E5E1] bg-[#EAF6F5] p-3 text-sm">
                <div className="flex justify-between font-semibold text-nout-texte">
                  <span>Tu reçois</span>
                  <span className="text-[#0E7FAB] text-base">{formatPrice(computeSellerPayout(Number(price)))}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Tu encaisses l'intégralité de ton prix, sans aucun frais déduit. Les frais de service
                  (protection acheteur) sont payés par l'acheteur, en plus de ton prix.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Ville</label>
            <select
              ref={cityRef}
              required
              value={city}
              onChange={(e) => { setCity(e.target.value); if (errorField === 'city') setErrorField('') }}
              className={`input-field cursor-pointer ${errorField === 'city' ? 'border-red-400 ring-2 ring-red-200' : ''}`}
            >
              <option value="">Choisir ta ville...</option>
              {REUNION_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── RÉDACTION AUTO (en bas : on l'utilise une fois les détails remplis) ── */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border transition-all ${
              canGenerate
                ? 'text-white bg-[#00C4B4] border-[#00C4B4] hover:bg-[#00b0a2]'
                : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Rédiger le titre et la description
          </button>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            {canGenerate
              ? 'Génère le titre et la description à partir des infos saisies — tu pourras les modifier.'
              : "Renseigne d'abord la catégorie et au moins la marque, la taille ou la couleur."}
          </p>
        </div>

        {/* ── SUBMIT ── */}
        <button
          type="submit"
          disabled={loading}
          className={`btn-primary w-full py-4 text-base ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Publication en cours…' : 'Publier mon annonce'}
        </button>

      </form>
    </div>
    </>
  )
}
