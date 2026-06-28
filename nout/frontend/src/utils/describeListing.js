// Génère un titre et une description à partir des attributs déjà saisis par le
// vendeur (marque, catégorie, sous-catégorie, taille, couleur, matière, état).
// Aucune IA : 100% local, gratuit, instantané. Sert d'aide à la rédaction —
// le vendeur peut tout modifier ensuite.
import { CATEGORIES, CONDITIONS } from './categories'

// Phrases d'accroche selon l'état, pour une description vivante (pas robotique)
const CONDITION_PHRASES = {
  neuf_avec_etiquette: "Neuf avec étiquette, jamais porté.",
  neuf_sans_etiquette: "Neuf sans étiquette, jamais porté.",
  tres_bon_etat:       "En très bon état, très peu porté.",
  bon_etat:            "En bon état, porté avec soin.",
  etat_correct:        "En état correct, quelques traces d'usage (voir photos).",
}

// Nom d'article lisible (« une robe », « une paire de chaussures »…).
// On part de la sous-catégorie quand elle est parlante, sinon de la catégorie.
// { n: nom au singulier, g: genre 'm'|'f', pl: true si pluriel (ex : chaussures) }
const ARTICLE_BY_SUB = {
  'femme-robes':     { n: 'robe', g: 'f' },
  'femme-hauts':     { n: 'haut', g: 'm' },
  'femme-pantalons': { n: 'pantalon', g: 'm' },
  'femme-jupes':     { n: 'jupe', g: 'f' },
  'femme-manteaux':  { n: 'manteau', g: 'm' },
  'femme-maillots':  { n: 'maillot de bain', g: 'm' },
  'homme-hauts':     { n: 't-shirt', g: 'm' },
  'homme-pantalons': { n: 'pantalon', g: 'm' },
  'homme-sweats':    { n: 'sweat', g: 'm' },
  'homme-manteaux':  { n: 'manteau', g: 'm' },
  'homme-shorts':    { n: 'short', g: 'm' },
  'acc-bijoux':      { n: 'bijou', g: 'm' },
  'acc-montres':     { n: 'montre', g: 'f' },
  'acc-ceintures':   { n: 'ceinture', g: 'f' },
  'acc-lunettes':    { n: 'paire de lunettes', g: 'f' },
  'acc-chapeaux':    { n: 'chapeau', g: 'm' },
  'sacs-main':       { n: 'sac à main', g: 'm' },
  'sacs-dos':        { n: 'sac à dos', g: 'm' },
  'sacs-pochettes':  { n: 'pochette', g: 'f' },
}
const ARTICLE_BY_CAT = {
  'vetements-femme':  { n: 'vêtement', g: 'm' },
  'vetements-homme':  { n: 'vêtement', g: 'm' },
  'vetements-enfant': { n: 'vêtement enfant', g: 'm' },
  'chaussures':       { n: 'paire de chaussures', g: 'f' },
  'accessoires':      { n: 'accessoire', g: 'm' },
  'sacs':             { n: 'sac', g: 'm' },
  'beaute':           { n: 'produit', g: 'm' },
  'electronique':     { n: 'article', g: 'm' },
}

const labelOfCategory = (id) => CATEGORIES.find(c => c.id === id)?.label ?? ''
const labelOfSub = (catId, subId) => {
  const cat = CATEGORIES.find(c => c.id === catId)
  return cat?.sub?.find(s => s.id === subId)?.label ?? ''
}

const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const cap   = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// Accord simple de la couleur au féminin (bleu → bleue, vert → verte…)
const COLOR_FEM = {
  Blanc: 'blanche', Noir: 'noire', Gris: 'grise', Vert: 'verte',
  Bleu: 'bleue', Violet: 'violette',
}
const accordCouleur = (color, genre) => {
  if (!color) return ''
  if (genre === 'f' && COLOR_FEM[color]) return COLOR_FEM[color]
  return lower(color)
}

// "Le Tampon" → "au Tampon", "La Possession" → "à La Possession"
const villePhrase = (city) => {
  if (!city) return ''
  if (city.startsWith('Le ')) return `au ${city.slice(3)}`
  return `à ${city}`
}

// Renvoie { title, description }
export function describeListing({ brand, category, subcategory, size, color, material, condition, city }) {
  const sub = subcategory ? labelOfSub(category, subcategory) : ''
  const cat = labelOfCategory(category)
  const article = ARTICLE_BY_SUB[subcategory] || ARTICLE_BY_CAT[category] || { n: 'article', g: 'm' }

  // ── TITRE : Marque + type + couleur + taille ──
  // Type lisible pour le titre : sous-catégorie si dispo, sinon catégorie
  const titleType = sub || cat
  const title = [
    brand || null,
    titleType || null,
    color || null,
    size ? `T.${size}` : null,
  ].filter(Boolean).join(' · ').slice(0, 80)

  // ── DESCRIPTION ──
  const parts = []

  // Phrase d'intro naturelle : "Jolie robe Zara, bleue."
  const couleur = accordCouleur(color, article.g)
  const intro = [
    article.g === 'f' ? 'Jolie' : 'Joli',
    article.n,
    brand ? brand : null,
  ].filter(Boolean).join(' ')
  parts.push(couleur ? `${intro}, ${couleur}.` : `${intro}.`)

  // État
  if (condition && CONDITION_PHRASES[condition]) parts.push(CONDITION_PHRASES[condition])

  // Taille / matière
  const details = []
  if (size)     details.push(`Taille ${size}`)
  if (material) details.push(`matière ${lower(material)}`)
  if (details.length) parts.push(cap(details.join(', ')) + '.')

  // Localisation / remise en main propre
  if (city) parts.push(`Remise en main propre possible ${villePhrase(city)}, ou envoi.`)

  // Phrase d'appel
  parts.push("N'hésite pas si tu as une question !")

  return { title, description: parts.join('\n') }
}
