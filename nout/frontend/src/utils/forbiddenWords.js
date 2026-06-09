// Liste des mots interdits sur NOUT 974
// Modifie librement ce fichier pour ajouter / retirer des termes.
// Les mots simples sont vérifiés avec frontière de mot (évite les faux positifs).
// Les phrases multi-mots sont vérifiées par inclusion exacte.

const normalize = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Mots simples — vérifiés avec frontière de mot
const WORD_LIST = [
  // Drogues
  'zamal', 'weed', 'beuh', 'shit', 'cannabis', 'marijuana',
  'cocaine', 'cocaïne', 'heroine', 'heroïne', 'crack',
  'mdma', 'ecstasy', 'lsd', 'taz', 'ketamine', 'keta',
  'haschich', 'hasch', 'stupefiant', 'stupefiants',
  // Prostitution
  'escort', 'prostitu', 'callgirl', 'camgirl', 'maquereau',
  // Armes
  'explosif', 'explosifs', 'kalachnikov', 'kalashnikov',
  'munitions',
  // Insultes françaises
  'connard', 'connasse', 'salope', 'encule', 'enculee',
  'fdp', 'batard',
  // Insultes créoles réunionnaises
  'bardasse', 'kouyons',
]

// Phrases multi-mots — vérifiées par inclusion simple (normalisée)
const PHRASE_LIST = [
  // Prostitution
  'call girl', 'plan cul', 'sexe tarifé', 'sexe payant',
  'massage erotique', 'massage sensuel', 'massage tantrique',
  'sugar baby', 'sugar daddy', 'cam girl',
  // Drogues
  'crystal meth', 'methamphetamine', 'marie jeanne',
  'resine de cannabis', 'poudre blanche',
  // Armes
  'arme a feu', 'arme de guerre', 'pistolet automatique',
  'revolver automatique', 'fusil automatique',
  'bombe artisanale', 'munitions calibre',
  // Insultes françaises
  'fils de pute', 'nique ta mere', 'nique sa mere',
  'va te faire foutre', 'va te faire enc',
  'je vais te tuer', 'je vais te crever',
  'sale batard', 'sale batar',
  // Insultes créoles
  'va fout', 'fout moin la paix', 'ou pe ale fout',
]

export function containsForbiddenWord(text) {
  if (!text) return { found: false, word: null }
  const norm = normalize(text)

  // Vérification des phrases (inclusion simple)
  for (const phrase of PHRASE_LIST) {
    if (norm.includes(normalize(phrase))) {
      return { found: true, word: phrase }
    }
  }

  // Vérification des mots simples (frontière de mot)
  for (const word of WORD_LIST) {
    const nw = normalize(word)
    const regex = new RegExp(`(?<![a-z0-9])${nw}(?![a-z0-9])`)
    if (regex.test(norm)) {
      return { found: true, word }
    }
  }

  return { found: false, word: null }
}
