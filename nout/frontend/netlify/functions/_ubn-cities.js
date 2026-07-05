// Table Ville → Code Postal imposée par le HUB UBN (doc API Distant v4.6 §20). Le HUB refuse les couples
// ville/CP non conformes (erreur city_postcode_mismatch) → on impose le CP officiel depuis la ville, jamais
// de saisie CP libre. SOURCE UNIQUE serveur (checkout + création d'étiquette) — miroir de src/utils/ubn.js.
//
// Ces 16 communes sont EXACTEMENT celles listées §20 du guide v4.6 (livraison UBN à domicile). Une commune
// hors liste n'est PAS desservie en domicile → le checkout la refuse (l'acheteur prend relais / Chronopost).
const UBN_CITY_CP = {
  'Sainte-Marie':   '97438',
  'Saint-Denis':    '97400',
  'Sainte-Clotilde':'97490',
  'Saint-Pierre':   '97410',
  'Saint-Paul':     '97460',
  'Saint-Leu':      '97436',
  'Le Port':        '97420',
  'La Possession':  '97419',
  'Saint-Benoît':   '97470',
  'Bras-Panon':     '97412',
  'Saint-Louis':    '97450',
  'Le Tampon':      '97430',
  'Saint-Joseph':   '97480',
  'Petite-Île':     '97429',
  'Étang-Salé':     '97427',
  'Les Avirons':    '97425',
}

// Normalise une ville pour un lookup tolérant (casse / accents / tirets) : « SAINT-DENIS » = « Saint-Denis ».
const norm = (s) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, ' ')
const BY_NORM = Object.fromEntries(Object.entries(UBN_CITY_CP).map(([k, v]) => [norm(k), v]))

// CP officiel UBN pour une ville (ou null si non desservie en domicile).
function ubnPostcodeFor(city) { return BY_NORM[norm(city)] || null }
function isUbnCovered(city) { return ubnPostcodeFor(city) != null }

module.exports = { UBN_CITY_CP, ubnPostcodeFor, isUbnCovered }
