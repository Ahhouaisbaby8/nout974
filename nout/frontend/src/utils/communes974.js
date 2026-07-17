// Liste des communes de La Réunion (974) → code postal principal.
// Sert au SÉLECTEUR de commune au checkout (choix « scroll » plutôt que saisie libre du CP) :
// choisir la commune remplit le CP automatiquement, on trie ensuite les points relais par proximité.
// NB : certaines communes ont plusieurs CP (Saint-Denis/Saint-Paul…) — on garde le CP principal ; le CP
// n'est ici qu'un point d'ancrage pour trouver les relais proches, pas une adresse exacte.
// Pour la LIVRAISON À DOMICILE UBN, seule la table UBN (16 communes, src/utils/ubn.js) est valide côté HUB.
export const REUNION_CP = {
  'Les Avirons':             '97425',
  'Bras-Panon':              '97412',
  'Cilaos':                  '97413',
  'Entre-Deux':              '97414',
  "L'Étang-Salé":            '97427',
  'Petite-Île':              '97429',
  'La Plaine-des-Palmistes': '97431',
  'Le Port':                 '97420',
  'La Possession':           '97419',
  'Saint-André':             '97440',
  'Saint-Benoît':            '97470',
  'Saint-Denis':             '97400',
  'Sainte-Clotilde':         '97490',
  'Saint-Joseph':            '97480',
  'Saint-Leu':               '97436',
  'Saint-Louis':             '97450',
  'Saint-Paul':              '97460',
  'Saint-Philippe':          '97442',
  'Saint-Pierre':            '97410',
  'Sainte-Marie':            '97438',
  'Sainte-Rose':             '97439',
  'Sainte-Suzanne':          '97441',
  'Salazie':                 '97433',
  'Le Tampon':               '97430',
  'Trois-Bassins':           '97426',
}

// Communes triées par ordre alphabétique français (pour l'affichage du menu déroulant).
export const REUNION_COMMUNES = Object.keys(REUNION_CP).sort((a, b) => a.localeCompare(b, 'fr'))

// CP principal d'une commune (null si inconnue).
export const cpForCommune = (city) => REUNION_CP[city] ?? null

// Distance approximative (km) entre deux points géo (haversine) — pour trier les relais par proximité.
export function distanceKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Trie une liste de points relais du plus proche au plus loin du code postal saisi :
//   1) les relais du CP EXACT d'abord (leurs coordonnées servent d'ancre) ;
//   2) puis par distance géographique à cette ancre (les relais ont lat/lng) ;
//   3) sinon par proximité numérique de CP.
// UBN renvoie souvent TOUS ses relais de l'île sans filtrer le CP → sans ce tri, le relais du quartier
// de l'acheteur peut se retrouver en bas de liste. `points` doit contenir { postcode, lat, lng }.
export function sortRelaysByProximity(points, cp) {
  const enteredCp = String(cp || '').trim()
  const cpNum = parseInt(enteredCp, 10)
  const exact = points.find((p) => p.postcode === enteredCp && p.lat != null && p.lng != null)
  const anchor = exact ? [exact.lat, exact.lng] : null
  return [...points].sort((a, b) => {
    const ax = a.postcode === enteredCp ? 0 : 1
    const bx = b.postcode === enteredCp ? 0 : 1
    if (ax !== bx) return ax - bx
    if (anchor) {
      const da = a.lat != null ? distanceKm(anchor, [a.lat, a.lng]) : Infinity
      const db = b.lat != null ? distanceKm(anchor, [b.lat, b.lng]) : Infinity
      if (da !== db) return da - db
    }
    const na = Number.isNaN(cpNum) ? 0 : Math.abs((parseInt(a.postcode, 10) || 99999) - cpNum)
    const nb = Number.isNaN(cpNum) ? 0 : Math.abs((parseInt(b.postcode, 10) || 99999) - cpNum)
    return na - nb
  })
}
