// ─── NOUT Pro : données du constructeur de boutique ─────────────────────────────
// Porté de la démo validée (artifact v15) : 12 thèmes, 12 boutiques-démo (identités
// fictives 974 créées par ateliers multi-agents), univers, polices, textes générés.
// AUCUN calcul d'argent ici : les prix affichés passent par utils/shipping
// (computeProtectionFee / computeBuyerTotal) — source de vérité unique.
// Les images de démo sont des URLs Unsplash (licence libre, usage commercial) :
// routes DEV-ONLY, jamais dans le build prod.

// ── Polices de titre (le corps reste Inter, comme NOUT) ──
export const FONTS = {
  montserrat: { label: 'Moderne',   fam: "'Montserrat','Segoe UI',sans-serif",        gf: 'Montserrat:wght@700;800' },
  playfair:   { label: 'Élégante',  fam: "'Playfair Display',Georgia,serif",          gf: 'Playfair+Display:wght@700' },
  lora:       { label: 'Douce',     fam: "'Lora',Georgia,serif",                      gf: 'Lora:wght@600' },
  poppins:    { label: 'Ronde',     fam: "'Poppins','Segoe UI',sans-serif",           gf: 'Poppins:wght@700' },
  grotesk:    { label: 'Tech',      fam: "'Space Grotesk','Segoe UI',sans-serif",     gf: 'Space+Grotesk:wght@700' },
  archivo:    { label: 'Affirmée',  fam: "'Archivo Black','Arial Black',sans-serif",  gf: 'Archivo+Black' },
  dmserif:    { label: 'Éditoriale',fam: "'DM Serif Display',Georgia,serif",          gf: 'DM+Serif+Display' },
  cormorant:  { label: 'Raffinée',  fam: "'Cormorant Garamond',Georgia,serif",        gf: 'Cormorant+Garamond:wght@600' },
  nunito:     { label: 'Arrondie',  fam: "'Nunito','Segoe UI',sans-serif",            gf: 'Nunito:wght@800' },
  oswald:     { label: 'Condensée', fam: "'Oswald','Arial Narrow',sans-serif",        gf: 'Oswald:wght@500' },
  // 16 familles issues de la recherche « meilleures polices web » (workflow 10/08 — Google Fonts, gratuites)
  bodoni:     { label: 'Couture',    fam: "'Bodoni Moda',Georgia,serif",              gf: 'Bodoni+Moda:wght@600' },
  fraunces:   { label: 'Chaleureuse',fam: "'Fraunces',Georgia,serif",                 gf: 'Fraunces:wght@600' },
  marcellus:  { label: 'Romaine',    fam: "'Marcellus',Georgia,serif",                gf: 'Marcellus' },
  italiana:   { label: 'Fine',       fam: "'Italiana',Georgia,serif",                 gf: 'Italiana' },
  caslon:     { label: 'Littéraire', fam: "'Libre Caslon Display',Georgia,serif",     gf: 'Libre+Caslon+Display' },
  tenor:      { label: 'Épurée',     fam: "'Tenor Sans','Segoe UI',sans-serif",       gf: 'Tenor+Sans' },
  bricolage:  { label: 'Artisanale', fam: "'Bricolage Grotesque','Segoe UI',sans-serif", gf: 'Bricolage+Grotesque:wght@700' },
  sora:       { label: 'Précise',    fam: "'Sora','Segoe UI',sans-serif",             gf: 'Sora:wght@700' },
  unbounded:  { label: 'Futuriste',  fam: "'Unbounded','Segoe UI',sans-serif",        gf: 'Unbounded:wght@700' },
  outfit:     { label: 'Aérienne',   fam: "'Outfit','Segoe UI',sans-serif",           gf: 'Outfit:wght@600' },
  instrument: { label: 'Studio',     fam: "'Instrument Sans','Segoe UI',sans-serif",  gf: 'Instrument+Sans:wght@700' },
  manrope:    { label: 'Minimale',   fam: "'Manrope','Segoe UI',sans-serif",          gf: 'Manrope:wght@800' },
  anton:      { label: 'Percutante', fam: "'Anton','Arial Narrow',sans-serif",        gf: 'Anton' },
  baloo:      { label: 'Ludique',    fam: "'Baloo 2','Segoe UI',sans-serif",          gf: 'Baloo+2:wght@700' },
  fredoka:    { label: 'Joyeuse',    fam: "'Fredoka','Segoe UI',sans-serif",          gf: 'Fredoka:wght@600' },
  caveat:     { label: 'Manuscrite', fam: "'Caveat',cursive",                         gf: 'Caveat:wght@600' },
}

// Polices CONSEILLÉES par univers (proposées en premier ; toutes restent disponibles)
export const FONT_CONTEXTS = {
  Mode: ['playfair', 'bodoni', 'tenor', 'instrument', 'archivo'],
  'Beauté': ['lora', 'fraunces', 'manrope', 'italiana', 'tenor'],
  Maison: ['lora', 'outfit', 'fraunces', 'marcellus', 'caslon'],
  Food: ['poppins', 'fraunces', 'bricolage', 'caveat', 'baloo'],
  'Électronique': ['grotesk', 'sora', 'unbounded', 'manrope'],
  Luminaires: ['outfit', 'instrument', 'grotesk', 'marcellus'],
  'Hygiène': ['poppins', 'manrope', 'tenor', 'montserrat'],
  Art: ['playfair', 'italiana', 'caslon', 'instrument', 'caveat'],
  Sport: ['grotesk', 'anton', 'unbounded', 'oswald', 'fredoka'],
  Enfants: ['nunito', 'baloo', 'fredoka', 'caveat'],
  Bijoux: ['cormorant', 'bodoni', 'marcellus', 'italiana'],
  Services: ['grotesk', 'sora', 'montserrat', 'instrument'],
  'Créateur': ['poppins', 'unbounded', 'caveat', 'manrope'],
  Autre: ['montserrat', 'dmserif', 'bricolage', 'outfit'],
}

// Charge les polices de titre en DEV uniquement (Google Fonts, comme index.html)
export function loadProFonts() {
  if (document.getElementById('nout-pro-fonts')) return
  const fams = Object.values(FONTS).map(f => 'family=' + f.gf).join('&')
  const link = document.createElement('link')
  link.id = 'nout-pro-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?' + fams + '&display=swap'
  document.head.appendChild(link)
}

// ── 12 thèmes (layout + police + accent par défaut) ──
export const THEMES = [
  { id: 'epuree',    name: 'Épurée',    vibe: 'Minimaliste & chic',            lay: 'minimal', font: 'playfair', dark: false, acc: '#0E8C82' },
  { id: 'vitrine',   name: 'Vitrine',   vibe: "Grande image d'accueil",        lay: 'hero',    font: 'lora',     dark: false, acc: '#B5563F' },
  { id: 'marche',    name: 'Marché',    vibe: 'Chaleureux & gourmand',         lay: 'market',  font: 'poppins',  dark: false, acc: '#4E7C4E' },
  { id: 'douce',     name: 'Douce',     vibe: 'Douce & élégante',              lay: 'soft',    font: 'lora',     dark: false, acc: '#C86B8E' },
  { id: 'moderne',   name: 'Moderne',   vibe: 'Sombre & premium',              lay: 'modern',  font: 'grotesk',  dark: true,  acc: '#4FA9E0' },
  { id: 'grille',    name: 'Grille',    vibe: 'Dense & éditorial',             lay: 'grid',    font: 'archivo',  dark: false, acc: '#C24E3B' },
  { id: 'lumina',    name: 'Lumina',    vibe: 'Sombre chaud, image en avant',  lay: 'hero',    font: 'grotesk',  dark: true,  acc: '#D98A2B' },
  { id: 'pure',      name: 'Pure',      vibe: 'Net & minimal',                 lay: 'minimal', font: 'poppins',  dark: false, acc: '#0E7FAB' },
  { id: 'studio',    name: 'Studio',    vibe: "Galerie d'art épurée",          lay: 'grid',    font: 'playfair', dark: false, acc: '#16202E' },
  { id: 'active',    name: 'Active',    vibe: 'Énergique & direct',            lay: 'modern',  font: 'grotesk',  dark: true,  acc: '#4E9E5B' },
  { id: 'marmaille', name: 'Marmaille', vibe: 'Doux & joyeux',                 lay: 'soft',    font: 'poppins',  dark: false, acc: '#DE8F3D' },
  { id: 'ecrin',     name: 'Écrin',     vibe: 'Précieux & minimal',            lay: 'soft',    font: 'playfair', dark: false, acc: '#5B5F97' },
  // Vitrines « services » = mode CONTACT (devis via messagerie NOUT, pas de paiement de prestation)
  { id: 'conseil',   name: 'Conseil',   vibe: 'Vitrine & prise de contact',    lay: 'minimal', font: 'grotesk',  dark: false, acc: '#16202E', mode: 'contact' },
  { id: 'terrain',   name: 'Terrain',   vibe: 'Services de terrain',           lay: 'hero',    font: 'poppins',  dark: false, acc: '#2F6B4F', mode: 'contact' },
  { id: 'bio',       name: 'Bio',       vibe: 'Tous tes liens, une page',      lay: 'bio',     font: 'poppins',  dark: true,  acc: '#8B5CF6', mode: 'bio' },
  // 4 templates de plus sur les catégories les moins fournies (Portfolio, Services, Lien en bio, Santé & beauté)
  { id: 'galerie',   name: 'Galerie',   vibe: 'Portfolio en grand',            lay: 'hero',    font: 'cormorant', dark: false, acc: '#7A5C3E' },
  { id: 'metier',    name: 'Métier',    vibe: 'Artisan & interventions',       lay: 'market',  font: 'manrope',   dark: false, acc: '#1F5F8B', mode: 'contact' },
  { id: 'spot',      name: 'Spot',      vibe: 'Page de liens claire',          lay: 'bio',     font: 'unbounded', dark: false, acc: '#E4572E', mode: 'bio' },
  { id: 'botanique', name: 'Botanique', vibe: 'Naturel & apaisant',            lay: 'soft',    font: 'fraunces',  dark: false, acc: '#5C7F52' },
  { id: 'cabinet',   name: 'Cabinet',   vibe: 'Sobre & institutionnel',        lay: 'minimal', font: 'instrument',dark: false, acc: '#1B3A5C', mode: 'contact' },
  { id: 'objectif',  name: 'Objectif',  vibe: 'Portfolio photo plein cadre',   lay: 'hero',    font: 'tenor',     dark: true,  acc: '#8A8478', mode: 'contact' },
]
export const themeById = (id) => THEMES.find(t => t.id === id) || THEMES[0]

// ── Univers (rayons + graines de produits + thèmes conseillés) ──
export const SECTORS = {
  Mode:          { rayons: ['Nouveautés', 'Robes', 'Accessoires', 'Sur-mesure'],          themes: ['epuree', 'grille', 'vitrine'] },
  'Beauté':      { rayons: ['Nouveautés', 'Soins', 'Cheveux', 'Coffrets'],                themes: ['douce', 'pure', 'epuree'] },
  Maison:        { rayons: ['Nouveautés', 'Déco', 'Cuisine', 'Textile'],                  themes: ['vitrine', 'grille', 'douce'] },
  Food:          { rayons: ['Nouveautés', 'Épicerie', 'Boissons', 'Coffrets'],            themes: ['marche', 'vitrine', 'grille'] },
  'Électronique':{ rayons: ['Nouveautés', 'High-tech', 'Accessoires', 'Occasions'],       themes: ['moderne', 'active', 'grille'] },
  Autre:         { rayons: ['Nouveautés', 'Populaires', 'Coups de cœur'],                 themes: ['epuree', 'grille', 'vitrine'] },
  Luminaires:    { rayons: ['Nouveautés', 'Suspensions', 'Lampadaires', 'Ambiance'],      themes: ['lumina', 'vitrine', 'moderne'] },
  'Hygiène':     { rayons: ['Nouveautés', 'Rasage', 'Dents', 'Coton & soin'],             themes: ['pure', 'epuree', 'douce'] },
  Art:           { rayons: ['Nouveautés', 'Tirages photo', 'Illustrations', 'Toiles'],    themes: ['studio', 'epuree', 'grille'] },
  Sport:         { rayons: ['Nouveautés', 'Trail & rando', 'Surf', 'Vélo'],               themes: ['active', 'moderne', 'grille'] },
  Enfants:       { rayons: ['Nouveautés', 'Jouets bois', 'Doudous', 'Bébé 0-2 ans'],      themes: ['marmaille', 'douce', 'marche'] },
  Bijoux:        { rayons: ['Nouveautés', 'Colliers', 'Boucles', 'Bracelets'],            themes: ['ecrin', 'epuree', 'douce'] },
  Services:      { rayons: ['Prestations', 'Réalisations', 'À propos'],                   themes: ['conseil', 'terrain', 'epuree'] },
  'Créateur':    { rayons: ['Liens'],                                                     themes: ['bio', 'studio', 'epuree'] },
}
export const SECS_MAIN = ['Mode', 'Beauté', 'Maison', 'Food', 'Électronique', 'Autre']
// Univers fin → famille affichée à l'étape « Que vends-tu ? » (les 6 grandes cases)
export const SECTOR_FAMILY = {
  Luminaires: 'Maison', 'Hygiène': 'Beauté', Bijoux: 'Mode',
  Art: 'Autre', Sport: 'Autre', Enfants: 'Autre', Services: 'Autre', 'Créateur': 'Autre',
}
export const familyOf = (sector) => (SECS_MAIN.includes(sector) ? sector : (SECTOR_FAMILY[sector] || 'Autre'))
export const SECTOR_LABEL = {
  Mode: 'Mode & accessoires', 'Beauté': 'Santé & beauté', Maison: 'Maison & déco',
  Food: 'Alimentaire', 'Électronique': 'High-tech', Autre: 'Autre',
  Luminaires: 'Luminaires & déco', 'Hygiène': 'Hygiène & quotidien', Art: 'Art & créations',
  Sport: 'Sport & loisirs', Enfants: 'Enfants & bébé', Bijoux: 'Bijoux & accessoires',
  Services: 'Entreprises & services', 'Créateur': 'Lien en bio',
}
export const SECTOR_RX = {
  Mode: /(mode|robe|v[eê]tement|lin|coutur|vestiaire|chemis|jean|sneaker|chaussure|sac|tissu|fait main|cousu)/i,
  'Beauté': /(beaut|cosm[eé]|soin|savon|parfum|cr[eè]me|maquill|peau|cheveux|mono[iï]|karit[eé]|s[eé]rum)/i,
  Maison: /(maison|d[eé]co|meuble|bois|bougie|linge|cuisine|vaisselle|plante|chin[eé]|objet|int[eé]rieur|vase)/i,
  // NB : « péi » est un mot créole générique (« lumière péi », « artisanat péi ») —
  // il ne doit PAS servir d'indice alimentaire, sinon il rafle toutes les détections.
  Food: /(food|[eé]pice|miel|rhum|caf[eé]|th[eé]|g[aâ]teau|confit|piment|gourmand|snack|boisson|go[uû]t|aliment|[eé]picerie)/i,
  'Électronique': /([eé]lectro|tech|t[eé]l[eé]phone|casque|gadget|informatique|gaming|enceinte|chargeur|console|ordinateur)/i,
  Luminaires: /(lampadaire|luminaire|lampe|lumi[eè]re|suspension|applique|[eé]clairage|ampoule|guirlande)/i,
  'Hygiène': /(rasoir|lame|brosse [aà] dents|hygi[eè]ne|rasage|coton lavable|d[eé]odorant)/i,
  Art: /(tirage|photographie|artiste|illustration|toile|tableau|portfolio|galerie|œuvre|oeuvre|dessin)/i,
  Sport: /(sport|rando|trail|surf|v[eé]lo|vtt|volcan|outdoor|fitness|musculation|p[eê]che)/i,
  Enfants: /(b[eé]b[eé]|enfant|marmaille|jouet|doudou|pu[eé]riculture|gigoteuse|naissance)/i,
  // « créole » retiré : c'est un adjectif local générique (déco créole, case créole),
  // pas un indice de bijouterie — « créoles gold-filled » est déjà capté par « gold ».
  Bijoux: /(bijou|collier|bague|bracelet|boucle d|gold[- ]filled|joaillerie|coquillage|perle)/i,
  Services: /(agence|service|conseil|entretien|nettoyage|d[eé]pannage|coach|studio cr[eé]atif|marketing|photographe pro|devis)/i,
  'Créateur': /(lien en bio|cr[eé]ateur de contenu|influenc|youtube|tiktok|instagram|podcast)/i,
}
// Les univers SPÉCIFIQUES sont testés avant les grandes familles : sans cet ordre,
// un mot large (« bois » dans Maison, « sac » dans Mode) capterait une boutique
// de luminaires ou de bijoux avant que son propre motif ne soit essayé.
// Art avant Sport : « tirages du volcan » est une galerie, pas de la randonnée.
const DETECT_ORDER = ['Luminaires', 'Hygiène', 'Bijoux', 'Enfants', 'Art', 'Sport',
  'Créateur', 'Services', 'Food', 'Beauté', 'Électronique', 'Mode', 'Maison']
export function detectSector(txt) {
  for (const k of DETECT_ORDER) if (SECTOR_RX[k] && SECTOR_RX[k].test(txt)) return k
  return 'Autre'
}

// ── Textes générés (« IA » déterministe — modèles à trous, remplaçable par une vraie API plus tard) ──
export function genTagline(sector) {
  return ({
    Mode: 'La mode péi, faite avec le cœur.', 'Beauté': 'La beauté naturelle de La Réunion.',
    Maison: 'La maison, version île intense.', Food: 'Le goût péi, livré chez toi.',
    'Électronique': 'La tech maligne, près de chez toi.', Luminaires: 'La lumière qui fait vivre la kaz.',
    'Hygiène': "L'essentiel durable, tous les jours.", Art: "Chaque pièce raconte l'île.",
    Sport: 'Prêt pour le volcan comme pour le lagon.', Enfants: 'Tout doux pour les marmailles.',
    Bijoux: 'Des pièces uniques, faites main.', Autre: 'Ma sélection, rien que pour toi.',
  }[sector]) || 'Ma sélection, rien que pour toi.'
}
export function genDescription(sector) {
  const lead = ({
    Mode: 'Des pièces choisies avec soin', 'Beauté': 'Des soins et cosmétiques sélectionnés',
    Maison: 'De belles trouvailles pour la maison', Food: 'Le meilleur du goût péi',
    'Électronique': 'Du matériel fiable, sélectionné pour toi', Luminaires: 'Des luminaires choisis pour réchauffer la kaz',
    'Hygiène': 'Des essentiels durables du quotidien', Art: 'Des œuvres et tirages en séries limitées',
    Sport: "De l'équipement qui tient, du volcan au lagon", Enfants: 'Des douceurs et jouets pour les marmailles',
    Bijoux: 'Des pièces uniques façonnées à la main', Autre: 'Une sélection choisie avec soin',
  }[sector]) || 'Une sélection choisie avec soin'
  return lead + " à La Réunion. Livraison en point relais partout sur l'île, paiement protégé par NOUT jusqu'à réception."
}

// ── Slug de boutique (nout.re/<slug>) — mêmes règles que la migration 20260806_shops.sql ──
export const RESERVED_SLUGS = new Set(['annonce', 'annonces', 'recherche', 'c', 'profil', 'profils',
  'createurs', 'commander', 'compte', 'comptes', 'espace-vendeur', 'admin', 'publier', 'messages',
  'favoris', 'notifications', 'boutique', 'boutiques', 'aide', 'legal', 'connexion', 'inscription',
  'nout', 'api', 'www', 'shop', 'pro',
  // routes NOUT Pro : le nom exact compte, « boutique » ne couvre pas « boutique-creer »
  'boutique-creer', 'boutique-templates', 'boutique-demo', 'boutique-tarifs', 'espace-pro',
  'tarifs', 'points-relais', 'comment-ca-marche', 'a-propos', 'installer-app', 'commandes',
  'parametres', 'reinitialiser', 'mot-de-passe-oublie', 'verifier-email', 'compte-active',
  'paiement-reussi', 'modifier'])
export function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '')
}

// ── Images de démo ──
// Servies depuis /public/pro (téléchargées une fois, licence Unsplash : usage commercial
// autorisé sans attribution). On NE pointe PAS vers images.unsplash.com : la galerie
// charge plus de 250 visuels d'un coup, Unsplash limitait les requêtes et les vignettes
// restaient blanches. En local, c'est instantané et il n'y a aucune dépendance externe.
const P = (id) => `/pro/p/${id}.jpg`   // visuel produit (380×507)
const H = (id) => `/pro/h/${id}.jpg`   // visuel d'accueil (1000×560)
// 8 visuels par univers : avec seulement 4, les 6 produits d'une boutique répétaient
// les mêmes photos (et le 2e visuel au survol retombait souvent sur la principale).
const STOCK_IDS = {
  mode:    ['1764298493197-a1c1cce57800', '1578747522731-9e5a179b02f7', '1578747522302-b987fbec4465', '1562636714-adbfdd55959d',
            '1658251007077-cbf0edfe1a2f', '1700317440744-a126fc87b900', '1682723840177-8c0dcd71f4a7', '1625158244856-e5e20f733c1f'],
  beaute:  ['1608571423902-eed4a5ad8108', '1615397349754-cfa2066a298e', '1580870069867-74c57ee1bb07', '1615396899839-c99c121888b0',
            '1620916297397-a4a5402a3c6c', '1616750819456-5cdee9b85d22', '1670201203116-26644750a726', '1583209814683-c023dd293cc6'],
  maison:  ['1612196808214-b8e1d6145a8c', '1580064141068-f42c18d153f5', '1623244307563-f9ade3df13c0', '1613109066368-af5078ebe626',
            '1553511667-567b93c369d4', '1621960144403-bffa83f713c1', '1592700186759-b5803d75625e', '1603252711728-c430e4cf5b36'],
  food:    ['1759749597861-e90685f026b4', '1758524152053-2d0ff084142d', '1730406929158-035f02dfd59f', '1784676527659-0f2e1a2fed48',
            '1767065886938-c06948fa4251', '1772864463642-42c789ab5dbd', '1727175435260-d4997a6cad71', '1760307207865-c49d6670e572'],
  tech:    ['1636115305669-9096bffe87fd', '1577048724846-cd9ff1dcacef', '1543493251-bc3e68468d1b', '1660921436563-65ec990056e5',
            '1615655406736-b37c4fabf923', '1591785944213-c8b5b7a75ec6', '1571771985403-f79bfdbd34ee', '1519335553051-96f1218cd5fa'],
  lumiere: ['1606425288528-4cebbfc69de7', '1624258391922-0b3056c471e7', '1629646526507-84ea50bb16e5', '1607809714110-e34f71c7b2ed',
            '1759647020559-2f91a4290ae4', '1630578877871-1a2f9d372fd2', '1688918511009-0b3992e6b020', '1642689703534-e41f29622078'],
  hygiene: ['1553265576-8533b2cdc606', '1623119598313-1238896695ce', '1553265331-3032aacd1a76', '1506029214967-eef911357d1b',
            '1733995471058-3d6ff2013de3', '1510711070725-068a3a878a99', '1779230778287-75fd0019a77c', '1735150949874-ec9c9c82b2c4'],
  art:     ['1610566725828-5e945c71393d', '1452639608291-23cd58f6864d', '1608232034071-c604ddc8470a', '1632258521940-b29d7d2ae9f5',
            '1738682767944-d3c255abac3c', '1649944138206-ea961325d7bb', '1634969948017-a9abffad732f', '1604757910263-bdf361745bed'],
  sport:   ['1499803270242-467f7311582d', '1592388748465-8c4dca8dd703', '1586022045315-1cdd6493045c', '1622260614153-03223fb72052',
            '1586022045076-aee0a185180b', '1566116386886-46622124e514', '1476979735039-2fdea9e9e407', '1509762774605-f07235a08f1f'],
  enfants: ['1637728226029-e590a9a16c4b', '1609811645795-f72ea07f47e9', '1560859251-d563a49c5e4a', '1622403718261-bd0e7dd01216',
            '1766918780916-228d10b071be', '1681034975099-0649594430e8', '1600987608520-29713f8cc23e', '1648159643766-1ba916a2bccf'],
  bijoux:  ['1651160670627-2896ddf7822f', '1606760227091-3dd870d97f1d', '1543294001-f7cd5d7fb516', '1601121141461-9d6647bca1ed',
            '1654781456542-fdd1683c79c3', '1688406264720-e2f9389c9ed1', '1611107683227-e9060eccd846', '1601121141418-c1caa10a2a0b'],
  // univers qui n'avaient AUCUN visuel dédié : ils empruntaient ceux de « maison ».
  // Volontairement VARIÉS (nettoyage, bureau/conseil, jardinage, entretien) : « services »
  // couvre des métiers très différents, une seule ambiance ne peut pas les représenter.
  services:  ['1628177142898-93e36e4e3a50', '1753162657289-6569cd1da479', '1504309092620-4d0ec726efa4', '1584378834085-0aa159117f9b',
              '1574856049959-d3134a3e592f', '1585077017412-1b54a783b8ac', '1563453392212-326f5e854473', '1742440710193-3547e0b9d4db',
              '1605702755163-4f303492e55f', '1585421514284-efb74c2b69ba', '1563279699-4c5dfcab048c', '1626571115951-15371ba9354b'],
  createur:  ['1673767298248-b128f17f89af', '1664277497087-51787d2b9d15', '1673767297196-ce9739933932', '1726066012749-f81bf4422d4e',
              '1603217039863-aa0c865404f7', '1630797160666-38e8c5ba44c1', '1695408246612-584543865997', '1673234759103-4bc13ee175d0'],
}
// Un TABLEAU par univers : avec une seule image, toutes les boutiques d'un même univers
// affichaient exactement le même hero (3 boutiques de services identiques à l'écran).
const HERO_IDS = {
  mode:    ['1764298493197-a1c1cce57800', '1700317440744-a126fc87b900', '1625158244856-e5e20f733c1f'],
  beaute:  ['1615397349754-cfa2066a298e', '1583209814683-c023dd293cc6', '1620916297397-a4a5402a3c6c'],
  maison:  ['1612196808214-b8e1d6145a8c', '1603252711728-c430e4cf5b36', '1592700186759-b5803d75625e'],
  food:    ['1758524152053-2d0ff084142d', '1760307207865-c49d6670e572', '1772864463642-42c789ab5dbd'],
  tech:    ['1577048724846-cd9ff1dcacef', '1519335553051-96f1218cd5fa', '1615655406736-b37c4fabf923'],
  lumiere: ['1642689703534-e41f29622078', '1759647020559-2f91a4290ae4', '1688918511009-0b3992e6b020'],
  hygiene: ['1733995471058-3d6ff2013de3', '1510711070725-068a3a878a99', '1735150949874-ec9c9c82b2c4'],
  art:     ['1649944138206-ea961325d7bb', '1604757910263-bdf361745bed', '1738682767944-d3c255abac3c'],
  sport:   ['1476979735039-2fdea9e9e407', '1509762774605-f07235a08f1f', '1566116386886-46622124e514'],
  enfants: ['1681034975099-0649594430e8', '1600987608520-29713f8cc23e', '1766918780916-228d10b071be'],
  bijoux:  ['1654781456542-fdd1683c79c3', '1611107683227-e9060eccd846', '1688406264720-e2f9389c9ed1'],
  services:['1753162657289-6569cd1da479', '1504309092620-4d0ec726efa4', '1628177142898-93e36e4e3a50', '1574856049959-d3134a3e592f'],
  createur:['1726066012749-f81bf4422d4e', '1630797160666-38e8c5ba44c1', '1695408246612-584543865997'],
}
const SECSLUG = {
  Mode: 'mode', 'Beauté': 'beaute', Maison: 'maison', Food: 'food', 'Électronique': 'tech', Autre: 'maison',
  Luminaires: 'lumiere', 'Hygiène': 'hygiene', Art: 'art', Sport: 'sport', Enfants: 'enfants', Bijoux: 'bijoux',
  Services: 'services', 'Créateur': 'createur',
}
export function stockImg(sector, i, seed = 0) {
  const ids = STOCK_IDS[SECSLUG[sector] || 'maison']
  const n = ids.length
  return P(ids[(((i + seed) % n) + n) % n])
}
// Empreinte stable d'une chaîne → sert à donner à CHAQUE boutique son propre hero
// (deux boutiques du même univers ne doivent pas afficher la même photo d'accueil).
export function seedOf(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 100000
  return h
}
export function heroImg(sector, seed = 0) {
  const list = HERO_IDS[SECSLUG[sector] || 'maison']
  return H(list[((seed % list.length) + list.length) % list.length])
}
// Nombre de visuels d'accueil disponibles pour un univers (galerie de « Personnaliser »)
export function heroCount(sector) {
  return HERO_IDS[SECSLUG[sector] || 'maison'].length
}

// ── 12 boutiques-démo (identités fictives 974, une par thème) ──
export const DEMOS = {
  epuree: { template: 'epuree', sector: 'Mode', family: 'Mode', accent: '#0E8C82', brand: 'Atelier Filao',
    tagline: 'Lin et coton cousus main à Saint-Paul',
    description: "Pièces en lin et coton dessinées et cousues à la main dans un atelier de Saint-Paul. Des coupes simples, pensées pour la vie péi, en petites séries.",
    products: [{ title: 'Robe longue Boucan', price: 89 }, { title: 'Top Savane lin lavé', price: 45 }, { title: 'Jupe portefeuille', price: 59 }, { title: 'Chemise Grand Fond', price: 69 }, { title: 'Foulard coton bio', price: 19 }, { title: 'Cabas coton atelier', price: 15 }] },
  vitrine: { template: 'vitrine', sector: 'Maison', family: 'Maison', accent: '#B5563F', brand: 'Kaz Kalou',
    tagline: 'Une âme créole pour votre intérieur',
    description: "Boutique de déco péi à Saint-Pierre : pièces chinées avec soin, artisanat local et textile maison pour donner du caractère à votre kaz.",
    products: [{ title: 'Vase terre cuite', price: 34 }, { title: 'Panier vacoa tressé', price: 28 }, { title: 'Bougie vanille Bourbon', price: 14 }, { title: 'Nappe lin rayé', price: 42 }, { title: 'Miroir rotin chiné', price: 65 }, { title: 'Carafe verre soufflé', price: 22 }] },
  marche: { template: 'marche', sector: 'Food', family: 'Food', accent: '#4E7C4E', brand: 'Ti Marché Lontan',
    tagline: 'Du marché de Saint-Denis à votre kaz',
    description: "Épicerie fine créole à Saint-Denis : miel, rhums arrangés, café et confitures artisanales, sélectionnés chez les producteurs de l'île.",
    products: [{ title: 'Miel vert de tamarin', price: 12.5 }, { title: 'Rhum arrangé ananas', price: 28 }, { title: 'Café Bourbon pointu', price: 24.9 }, { title: 'Confiture goyavier', price: 6.9 }, { title: 'Pâte de piment péi', price: 5.5 }, { title: 'Coffret saveurs péi', price: 49 }] },
  douce: { template: 'douce', sector: 'Beauté', family: 'Beauté', accent: '#C86B8E', brand: 'Bulle Lagon',
    tagline: 'Des soins naturels nés au bord du lagon',
    description: "Savons, huiles et baumes fabriqués en petites séries à Saint-Gilles, avec des plantes péi. Des soins doux, pensés pour la peau au soleil de La Réunion.",
    products: [{ title: 'Savon coco vanille', price: 7.5 }, { title: 'Huile de monoï péi', price: 18 }, { title: 'Baume géranium Bourbon', price: 14.5 }, { title: 'Gommage sucre combava', price: 16 }, { title: 'Brume florale ylang', price: 22 }, { title: 'Coffret douceur lagon', price: 49 }] },
  moderne: { template: 'moderne', sector: 'Électronique', family: 'Électronique', accent: '#4FA9E0', brand: 'Voltaj',
    tagline: 'La tech reconditionnée du Port, testée et garantie',
    description: "Accessoires tech et appareils reconditionnés au Port. Chaque produit est testé, nettoyé et garanti 6 mois, avec retrait en boutique ou livraison péi.",
    products: [{ title: 'Casque antibruit', price: 79 }, { title: 'Chargeur rapide 65 W', price: 29 }, { title: 'Enceinte nomade IPX7', price: 55 }, { title: 'Coque renforcée mate', price: 15 }, { title: 'Écouteurs sans fil', price: 39 }, { title: 'Batterie 20 000 mAh', price: 35 }] },
  grille: { template: 'grille', sector: 'Mode', family: 'Mode', accent: '#C24E3B', brand: 'Karo Fripe',
    tagline: 'Seconde main, premier choix',
    description: "Friperie urbaine au cœur de Saint-Denis. Pièces vintage, sneakers et sacs chinés à la main, remis en circulation pour habiller La Réunion sans gaspiller.",
    products: [{ title: 'Veste en jean 90s', price: 32 }, { title: 'Baskets rétro grises', price: 75 }, { title: 'Sac bandoulière cuir', price: 45 }, { title: 'Chemise créole lin', price: 24 }, { title: 'Casquette délavée 90s', price: 14 }, { title: 'Robe fleurie vintage', price: 28 }] },
  lumina: { template: 'lumina', sector: 'Luminaires', family: 'Maison', accent: '#D98A2B', brand: 'Fanal Studio',
    tagline: 'La lumière qui fait vivre la kaz, du salon à la varangue',
    description: "Luminaires design sélectionnés à La Réunion : suspensions, lampadaires et lumières d'ambiance pour réchauffer chaque pièce de la kaz.",
    products: [{ title: 'Suspension Rotin Anse', price: 89 }, { title: 'Lampadaire Arc Laiton', price: 219 }, { title: 'Lampe Galet Opaline', price: 45 }, { title: 'Guirlande Varangue', price: 29 }, { title: 'Ampoule Filament XL', price: 15 }, { title: 'Applique Bois Vacoa', price: 64 }] },
  pure: { template: 'pure', sector: 'Hygiène', family: 'Beauté', accent: '#0E7FAB', brand: 'Kabann Klér',
    tagline: "L'hygiène simple, durable, péi",
    description: "Rasage traditionnel et essentiels du quotidien sans plastique jetable, pensés à La Réunion pour durer des années.",
    products: [{ title: 'Rasoir de sûreté inox', price: 42 }, { title: 'Lames x50', price: 9.5 }, { title: 'Savon de rasage vétiver', price: 12 }, { title: 'Brosse à dents bambou', price: 6.5 }, { title: 'Têtes rechange x4', price: 8 }, { title: 'Cotons lavables x10', price: 14.9 }] },
  studio: { template: 'studio', sector: 'Art', family: 'Autre', accent: '#16202E', brand: 'Encre & Basalte',
    tagline: "Chaque tirage raconte un morceau de l'île",
    description: "Studio d'artiste au Guillaume : photographies, illustrations et petites toiles inspirées de l'île, en séries limitées signées et numérotées.",
    products: [{ title: 'Tirage Cap Méchant', price: 65 }, { title: 'Brumes de Mafate', price: 120 }, { title: 'Paille-en-queue encré', price: 28 }, { title: 'Toile Lave et Sel', price: 180 }, { title: 'Série Cases créoles', price: 45 }, { title: "Carte d'art Vacoa", price: 15 }] },
  active: { template: 'active', sector: 'Sport', family: 'Autre', accent: '#4E9E5B', brand: 'Kap Volkan',
    tagline: "Du volcan au lagon, l'équipement qui tient",
    description: "Rando au volcan, surf à l'ouest, trail dans les hauts : matériel testé péi, choisi pour durer sous le soleil comme sous la pluie des cirques.",
    products: [{ title: 'Sac trail 12 L', price: 64.9 }, { title: 'Bâtons carbone', price: 89 }, { title: 'Leash surf 7 pieds', price: 24.9 }, { title: 'Gourde filtrante', price: 32.5 }, { title: 'Casque VTT', price: 79 }, { title: 'Lampe frontale 900', price: 45.9 }] },
  marmaille: { template: 'marmaille', sector: 'Enfants', family: 'Autre', accent: '#DE8F3D', brand: 'Marmay Lune',
    tagline: "Douceurs et jouets pour les marmailles de l'île",
    description: "Boutique péi dédiée aux tout-petits : jouets en bois, doudous cousus main et vêtements bébé tout doux, choisis avec soin à La Réunion.",
    products: [{ title: 'Hochet bois naturel', price: 12 }, { title: 'Doudou tangue cousu main', price: 24 }, { title: 'Body coton bio 3-6 mois', price: 14 }, { title: 'Puzzle bois lagon', price: 19 }, { title: 'Gigoteuse nuage', price: 39 }, { title: "Arche d'éveil bois", price: 68 }] },
  ecrin: { template: 'ecrin', sector: 'Bijoux', family: 'Mode', accent: '#5B5F97', brand: 'Écrin Corail',
    tagline: 'Des pièces uniques, entre or et coquillages',
    description: "Créations en gold-filled, coquillages et pierres du 974, façonnées à la main en petites séries, dans un atelier posé au bord de mer.",
    products: [{ title: 'Créoles gold-filled', price: 48 }, { title: 'Collier porcelaine', price: 36 }, { title: 'Bracelet jaspe océan', price: 29 }, { title: 'Bague fine martelée', price: 42 }, { title: 'Sautoir cauri doré', price: 58 }, { title: 'Boucles pierre de lave', price: 24 }] },
  // Vitrines « Entreprises et services » — mode CONTACT : devis via la messagerie NOUT, aucun paiement de prestation
  conseil: { template: 'conseil', sector: 'Services', family: 'Autre', accent: '#16202E', brand: 'Oté Studio',
    tagline: 'Des marques péi qui marquent',
    description: "Studio créatif à Saint-Denis : identité visuelle, sites vitrines et contenus pour les entreprises de La Réunion. Chaque projet démarre par un échange, sans engagement.",
    products: [{ title: 'Identité visuelle', price: null }, { title: 'Site vitrine', price: null }, { title: 'Shooting produit', price: null }, { title: 'Réseaux sociaux', price: null }, { title: 'Vidéo drone', price: null }, { title: 'Packaging', price: null }] },
  terrain: { template: 'terrain', sector: 'Services', family: 'Autre', accent: '#2F6B4F', brand: 'Alizé Piscines',
    tagline: "Une eau claire toute l'année, sans y penser",
    description: "Entretien de piscines et d'espaces verts sur tout l'Ouest. Interventions planifiées, photos avant/après à chaque passage, devis répondu sous 24 h.",
    products: [{ title: 'Entretien mensuel', price: null }, { title: 'Remise en route', price: null }, { title: 'Nettoyage eau verte', price: null }, { title: 'Changement de sable', price: null }, { title: 'Taille de haies', price: null }, { title: 'Contrat annuel', price: null }] },
  // « Lien en bio » — page de liens du créateur, qui renvoie vers sa boutique NOUT
  bio: { template: 'bio', sector: 'Créateur', family: 'Autre', accent: '#8B5CF6', brand: 'Maya Kréol',
    tagline: 'Créatrice de contenu — La Réunion',
    description: "Recettes péi, bons plans 974 et vlogs. Retrouvez tout ici : vidéos, boutique et collaborations.",
    products: [],
    links: [{ title: 'Ma boutique NOUT', kind: 'shop' }, { title: 'Dernière vidéo YouTube', kind: 'video' }, { title: 'Instagram', kind: 'social' }, { title: 'TikTok', kind: 'social' }, { title: 'Mon podcast « Oté ! »', kind: 'audio' }, { title: 'Collaborations & contact', kind: 'contact' }] },

  // ── 4 boutiques-démo ajoutées sur les catégories les moins fournies ──
  galerie: { template: 'galerie', sector: 'Art', family: 'Autre', accent: '#7A5C3E', brand: 'Zanfan Papier',
    tagline: "L'île dessinée, imprimée à la main",
    description: "Illustratrice au Tampon : affiches, linogravures et carnets tirés en petites séries sur papier d'art, chaque pièce signée et numérotée.",
    products: [{ title: 'Affiche Piton des Neiges', price: 38 }, { title: 'Linogravure tangue', price: 55 }, { title: 'Carnet cases créoles', price: 18 }, { title: 'Série Vanille (3 cartes)', price: 22 }, { title: 'Affiche Grand Étang', price: 38 }, { title: 'Original encre de Chine', price: 145 }] },
  metier: { template: 'metier', sector: 'Services', family: 'Autre', accent: '#1F5F8B', brand: 'Nout Kaz Propre',
    tagline: 'Votre kaz impeccable, sans y penser',
    description: "Nettoyage de maisons, fins de chantier et vitres sur tout le Nord et l'Est. Équipe déclarée, produits écologiques, devis répondu sous 24 h.",
    products: [{ title: 'Ménage régulier', price: null }, { title: 'Grand nettoyage', price: null }, { title: 'Fin de chantier', price: null }, { title: 'Vitres et varangue', price: null }, { title: 'Nettoyage après location', price: null }, { title: 'Contrat entreprise', price: null }] },
  spot: { template: 'spot', sector: 'Créateur', family: 'Autre', accent: '#E4572E', brand: 'Ti Piment TV',
    tagline: 'Humour péi, tous les jeudis',
    description: "Sketchs, lives et coulisses. Retrouvez ici mes vidéos, mes dates de spectacle et la boutique de goodies.",
    products: [],
    links: [{ title: 'Ma boutique goodies', kind: 'shop' }, { title: 'Nouvelle vidéo', kind: 'video' }, { title: 'Billetterie spectacle', kind: 'contact' }, { title: 'Instagram', kind: 'social' }, { title: 'TikTok', kind: 'social' }, { title: 'Me contacter (pro)', kind: 'contact' }] },
  cabinet: { template: 'cabinet', sector: 'Services', family: 'Autre', accent: '#1B3A5C', brand: 'Cap Gestion',
    tagline: 'Votre comptabilité, claire et à jour',
    description: "Cabinet d'expertise comptable à Saint-Denis : création d'entreprise, bilans, paie et conseil fiscal pour les indépendants et TPE de La Réunion.",
    products: [{ title: 'Création d\'entreprise', price: null }, { title: 'Tenue comptable', price: null }, { title: 'Bilan annuel', price: null }, { title: 'Gestion de la paie', price: null }, { title: 'Conseil fiscal', price: null }, { title: 'Accompagnement TVA', price: null }] },
  objectif: { template: 'objectif', sector: 'Art', family: 'Autre', accent: '#8A8478', brand: 'Studio Lumen',
    tagline: 'Photographe — mariages, portraits, marques',
    description: "Photographe basée à Saint-Leu. Reportages de mariage, portraits et photo de produits pour les marques péi. Portfolio complet et disponibilités sur demande.",
    products: [{ title: 'Reportage mariage', price: null }, { title: 'Séance portrait', price: null }, { title: 'Photo de produits', price: null }, { title: 'Événement d\'entreprise', price: null }, { title: 'Shooting famille', price: null }, { title: 'Tirages d\'art', price: null }] },
  botanique: { template: 'botanique', sector: 'Beauté', family: 'Beauté', accent: '#5C7F52', brand: 'Vert Vanille',
    tagline: 'Les plantes de l\'île, en toute simplicité',
    description: "Herboristerie familiale à la Plaine-des-Palmistes : tisanes, macérats et baumes préparés à partir de plantes cueillies et séchées sur place.",
    products: [{ title: 'Tisane ayapana', price: 8.5 }, { title: 'Macérat de calophylle', price: 19 }, { title: 'Baume tamarin', price: 13.5 }, { title: 'Infusion nuit douce', price: 9.9 }, { title: 'Hydrolat géranium', price: 15 }, { title: 'Coffret herboristerie', price: 42 }] },
}
// Ordre d'affichage : regroupé par NATURE de site (boutiques → portfolios → services →
// pages de liens), pour que « Tous les templates » raconte quelque chose au lieu d'être
// un mélange. Chaque bloc va du plus vendeur au plus spécialisé.
export const TPL_ORDER = [
  // 1. Boutiques en ligne (vente de produits, tunnel NOUT complet)
  'epuree', 'lumina', 'marche', 'douce', 'moderne', 'vitrine', 'pure', 'active', 'ecrin', 'grille', 'marmaille', 'botanique',
  // 2. Portfolios (créateurs : montrer son travail, vendre ses œuvres ou être contacté)
  'studio', 'galerie', 'objectif',
  // 3. Entreprises et services (devis via la messagerie NOUT, aucun paiement de prestation)
  'conseil', 'cabinet', 'terrain', 'metier',
  // 4. Lien en bio (page de liens qui renvoie vers la boutique)
  'bio', 'spot',
]
// Mode réel d'une boutique-démo : 'escrow' (vend en ligne), 'contact' (devis), 'bio'.
// Le filtre « E-commerce » se base là-dessus et pas sur l'univers : un artiste qui vend
// ses tirages EST du e-commerce, un photographe sur devis n'en est pas.
export const modeOf = (demoOrId) => {
  const d = typeof demoOrId === 'string' ? DEMOS[demoOrId] : demoOrId
  return themeById(d?.template).mode || 'escrow'
}

// Filtres de la galerie — mots-clés validés (façon Horizons) ; `close` = les plus proches quand pas de dédié
// Chaque filtre doit montrer EXACTEMENT ce que son nom annonce.
export const TPL_CATS = [
  { l: 'Tous les templates', v: null },
  { l: 'E-commerce', mode: 'escrow' },          // uniquement ce qui vend réellement en ligne
  { l: 'Portfolio', v: ['Art'] },               // créateurs : œuvres et prestations
  { l: 'Entreprises et services', v: ['Services'] },
  { l: 'Lien en bio', v: ['Créateur'] },
  { l: 'Santé et beauté', v: ['Beauté', 'Hygiène'] },
]
export const TPL_MORE = [
  { l: 'Mode & accessoires', v: ['Mode', 'Bijoux'] },
  { l: 'Maison & déco', v: ['Maison', 'Luminaires'] },
  { l: 'Alimentaire & gourmand', v: ['Food'] },
  { l: 'High-tech', v: ['Électronique'] },
  { l: 'Sport & loisirs', v: ['Sport'] },
  { l: 'Enfants & bébé', v: ['Enfants'] },
]

// Rang de chaque boutique-démo DANS SON UNIVERS (0, 1, 2…). Sert de décalage d'images :
// une graine par hachage du nom tombait parfois sur le même reste (deux boutiques de
// services affichaient la même photo). Le rang garantit des visuels distincts.
const DEMO_RANK = (() => {
  const count = {}, rank = {}
  for (const id of TPL_ORDER) {
    const s = DEMOS[id]?.sector
    if (!s) continue
    count[s] = count[s] || 0
    rank[id] = count[s]++
  }
  return rank
})()
const IMG_STEP = 4   // espace les visuels entre deux boutiques du même univers

// Construit l'objet `shop` d'une boutique-démo (même forme que la future table `shops`)
const demoKeyOf = (d) => Object.keys(DEMOS).find((k) => DEMOS[k].brand === d.brand)

export function demoShop(d) {
  const t = themeById(d.template)
  const rank = DEMO_RANK[demoKeyOf(d)] || 0
  return {
    slug: slugify(d.brand), name: d.brand, tagline: d.tagline, description: d.description,
    accent_color: d.accent, font_key: t.font, template_key: t.id, mode: t.mode || 'escrow',
    sector: d.sector, rayons: SECTORS[d.sector]?.rayons || SECTORS.Autre.rayons,
    links: d.links || null,
    imgSeed: rank * IMG_STEP,   // chaque boutique de l'univers pioche d'autres visuels
    heroIdx: rank,
  }
}
export function demoListings(d) {
  const rayons = SECTORS[d.sector]?.rayons || SECTORS.Autre.rayons
  const seed = (DEMO_RANK[demoKeyOf(d)] || 0) * IMG_STEP
  return d.products.map((p, i) => ({
    id: 'demo-' + slugify(d.brand) + '-' + i,
    title: p.title, price: p.price, condition: 'neuf_sans_etiquette',
    rayon: rayons.length > 1 ? rayons[(i % (rayons.length - 1)) + 1] : rayons[0],
    city: 'Saint-Denis', created_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    is_sold: false, views: 8 + ((i * 13) % 40),
    // plusieurs visuels par produit (jusqu'à 8 côté pro) : montre le 2e au survol
    images: [stockImg(d.sector, i, seed), stockImg(d.sector, i + 1, seed), stockImg(d.sector, i + 2, seed)],
  }))
}
