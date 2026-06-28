// ─── UBN — Source de vérité côté front pour les modes de livraison UBN ───────────
// Doc : « UBN API Distant - Guide webmaster générique v4.5 ».
// UBN est AJOUTÉ à côté de Chronopost (voir shipping.js) — on ne remplace pas.
//
// ⚠️ SÉCURITÉ : ce fichier ne contient AUCUN secret. La clé API, l'URL du HUB et
// l'id client vivent uniquement côté serveur (Netlify Functions, variables d'env).
// Le navigateur n'appelle JAMAIS UBN directement — il passe par nos Functions proxy.

// Les 5 formulaires/services UBN avec leur code CANONIQUE (à utiliser tel quel
// dans service_id). Prix « indicatifs » de la doc — le tarif réel est calculé par
// le HUB (quote), on n'invente pas de prix localement pour la facturation.
export const UBN_SERVICES = {
  relais: {
    id: 'relais',
    code: 'relais',
    label: 'UBN — Point relais',
    sublabel: 'Retrait en point relais (sous 48/72h)',
    indicativeFee: 4,
    needsRelay: true,    // nécessite de choisir un point relais
    delay: 'Sous 48h/72h',
  },
  economique: {
    id: 'economique',
    code: 'economique',
    label: 'UBN — Économique 48/72h',
    sublabel: 'Livraison à domicile sous 48/72h',
    indicativeFee: 6,
    needsRelay: false,
    delay: 'Sous 48h/72h',
  },
  express: {
    id: 'express',
    code: 'express',
    label: 'UBN — Express',
    sublabel: 'Livraison à domicile en express',
    indicativeFee: 10,
    needsRelay: false,
    delay: 'Express',
  },
  express_pro: {
    id: 'express_pro',
    code: 'express_pro',
    label: 'UBN — Express Premium',
    sublabel: 'Retrait bureau ou magasin, créneau garanti',
    indicativeFee: 14,
    needsRelay: false,
    delay: 'Express Premium',
  },
  samedi_express: {
    id: 'samedi_express',
    code: 'samedi_express',
    label: 'UBN — Samedi Express',
    sublabel: 'Livraison à domicile le samedi',
    indicativeFee: 18,
    needsRelay: false,
    delay: 'Samedi',
  },
}

// Ordre d'affichage (du moins cher au plus cher)
export const UBN_SERVICE_ORDER = ['relais', 'economique', 'express', 'express_pro', 'samedi_express']

export const getUbnService = (id) => UBN_SERVICES[id] ?? null
export const isUbnService = (id) => Boolean(UBN_SERVICES[id])

// Table Ville ↔ Code postal (974) imposée par le HUB UBN.
// Le HUB refuse les couples ville/CP non conformes (erreur city_postcode_mismatch).
// → on remplit le CP automatiquement depuis la ville choisie, jamais de saisie libre.
export const UBN_CITY_CP = {
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

// CP officiel d'une ville (null si non couverte par UBN)
export const getUbnPostcode = (city) => UBN_CITY_CP[city] ?? null

// Une ville est-elle livrable par UBN ? (couple ville/CP connu du HUB)
export const isUbnCity = (city) => Boolean(UBN_CITY_CP[city])
