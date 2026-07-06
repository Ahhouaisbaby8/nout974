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
