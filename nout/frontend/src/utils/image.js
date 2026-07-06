// Redimensionne une image Supabase Storage via les paramètres de transformation
// (?width=&height=&resize=&quality=). Allège fortement le poids des images sur mobile
// (PageSpeed : LCP). Renvoie l'URL telle quelle si ce n'est pas une image Supabase.
//
// Supabase sert automatiquement du WebP si le navigateur le supporte (négociation
// via l'en-tête Accept), donc le simple fait de passer par le resize donne aussi WebP.
export const resizeImage = (url, { width = 800, height, quality = 70, resize = 'cover' } = {}) => {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('supabase.co/storage')) return url
  // 🔑 La transformation Supabase (redimensionnement + WebP) ne s'applique QUE sur l'endpoint
  // /storage/v1/render/image/public/ — PAS sur /object/public/ où les paramètres ?width= sont
  // IGNORÉS (l'image pleine taille est alors servie : ~470 Ko au lieu de ~20 Ko). On bascule l'URL.
  const base = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  const params = new URLSearchParams()
  params.set('width', String(width))
  if (height) params.set('height', String(height))
  params.set('quality', String(quality))
  params.set('resize', resize)
  // Évite de doubler une query déjà présente
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}${params.toString()}`
}

// Petites tailles prêtes à l'emploi (cohérence dans toute l'app)
export const thumbUrl  = (url) => resizeImage(url, { width: 400, height: 400, resize: 'cover' })
export const detailUrl = (url) => resizeImage(url, { width: 900, resize: 'contain' })

// ─── Validation des fichiers image AVANT upload (sécurité) ─────────────────────────
// Ne jamais faire confiance au NOM de fichier du client (extension falsifiable). On valide
// le TYPE MIME réel + la taille, et on dérive une extension SÛRE depuis le type. Empêche
// l'upload de .svg (JS embarqué), faux .jpg (html/php), et les fichiers trop lourds.
// NB : la vraie ceinture est côté Supabase (restrictions MIME + taille du bucket) ; ceci est
// la 1re barrière (UX : message clair + rejet immédiat).
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8 Mo
// Types autorisés → extension sûre. HEIC/HEIF inclus : ce sont les photos iPhone, qui peuvent
// arriver telles quelles si le ré-encodage canvas échoue (fallback iOS de imageCompressor.js).
// On BLOQUE en revanche image/svg+xml (JS embarqué) et tout ce qui n'est pas une vraie image.
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/heic': 'heic', 'image/heif': 'heif',
}

// Valide un fichier image. Jette une Error explicite si invalide. Renvoie une extension sûre.
export const validateImageFile = (file) => {
  if (!file || !ALLOWED_IMAGE_TYPES[file.type]) {
    throw new Error('Format non supporté. Utilise une image (JPEG, PNG, WebP ou photo iPhone).')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image trop lourde (max 8 Mo).')
  }
  return ALLOWED_IMAGE_TYPES[file.type] // extension dérivée du TYPE réel, jamais du nom client
}
