export const CATEGORIES = [
  {
    id: 'vetements-femme', label: 'Vêtements femme', navLabel: 'Femme',
    sub: [
      { id: 'femme-hauts',           label: 'Hauts & t-shirts' },
      { id: 'femme-chemises',        label: 'Chemises & blouses' },
      { id: 'femme-pulls',           label: 'Pulls & gilets' },
      { id: 'femme-sweats',          label: 'Sweats & hoodies' },
      { id: 'femme-robes',           label: 'Robes' },
      { id: 'femme-jupes',           label: 'Jupes' },
      { id: 'femme-pantalons',       label: 'Pantalons & jeans' },
      { id: 'femme-shorts',          label: 'Shorts' },
      { id: 'femme-combinaisons',    label: 'Combinaisons' },
      { id: 'femme-manteaux',        label: 'Manteaux & vestes' },
      { id: 'femme-blazers',         label: 'Blazers & tailleurs' },
      { id: 'femme-maillots',        label: 'Maillots de bain' },
      { id: 'femme-lingerie',        label: 'Lingerie & pyjamas' },
      { id: 'femme-sport',           label: 'Vêtements de sport' },
      { id: 'femme-grossesse',       label: 'Grossesse' },
      { id: 'femme-grandes-tailles', label: 'Grandes tailles' },
    ],
  },
  {
    id: 'vetements-homme', label: 'Vêtements homme', navLabel: 'Homme',
    sub: [
      { id: 'homme-hauts',         label: 'Hauts & t-shirts' },
      { id: 'homme-chemises',      label: 'Chemises & polos' },
      { id: 'homme-sweats',        label: 'Sweats & pulls' },
      { id: 'homme-gilets',        label: 'Gilets & cardigans' },
      { id: 'homme-pantalons',     label: 'Pantalons & jeans' },
      { id: 'homme-shorts',        label: 'Shorts' },
      { id: 'homme-manteaux',      label: 'Manteaux & vestes' },
      { id: 'homme-costumes',      label: 'Costumes & blazers' },
      { id: 'homme-maillots',      label: 'Maillots de bain' },
      { id: 'homme-sport',         label: 'Vêtements de sport' },
      { id: 'homme-pyjamas',       label: 'Pyjamas & homewear' },
      { id: 'homme-sousvetements', label: 'Sous-vêtements & chaussettes' },
    ],
  },
  {
    id: 'vetements-enfant', label: 'Vêtements enfant', navLabel: 'Enfant',
    sub: [
      { id: 'enfant-bebe',          label: 'Bébé (0-2 ans)' },
      { id: 'enfant-fille',         label: 'Fille' },
      { id: 'enfant-garcon',        label: 'Garçon' },
      { id: 'enfant-bodies',        label: 'Bodies & grenouillères' },
      { id: 'enfant-hauts',         label: 'Hauts & t-shirts' },
      { id: 'enfant-pulls',         label: 'Pulls & sweats' },
      { id: 'enfant-robes',         label: 'Robes & jupes' },
      { id: 'enfant-pantalons',     label: 'Pantalons & shorts' },
      { id: 'enfant-manteaux',      label: 'Manteaux & vestes' },
      { id: 'enfant-pyjamas',       label: 'Pyjamas' },
      { id: 'enfant-maillots',      label: 'Maillots de bain' },
      { id: 'enfant-sousvetements', label: 'Sous-vêtements & chaussettes' },
      { id: 'enfant-ceremonie',     label: 'Tenues de cérémonie' },
      { id: 'enfant-deguisements',  label: 'Déguisements' },
      { id: 'enfant-lots',          label: 'Lots de vêtements' },
    ],
  },
  {
    id: 'chaussures', label: 'Chaussures',
    sub: [
      { id: 'chaussures-femme',      label: 'Femme' },
      { id: 'chaussures-homme',      label: 'Homme' },
      { id: 'chaussures-enfant',     label: 'Enfant' },
      { id: 'chaussures-baskets',    label: 'Baskets & sneakers' },
      { id: 'chaussures-bottes',     label: 'Bottes & bottines' },
      { id: 'chaussures-sandales',   label: 'Sandales & nu-pieds' },
      { id: 'chaussures-tongs',      label: 'Tongs & claquettes' },
      { id: 'chaussures-talons',     label: 'Talons & escarpins' },
      { id: 'chaussures-ballerines', label: 'Ballerines & mules' },
      { id: 'chaussures-ville',      label: 'Mocassins & derbies' },
      { id: 'chaussures-sport',      label: 'Chaussures de sport' },
      { id: 'chaussures-chaussons',  label: 'Chaussons & pantoufles' },
    ],
  },
  {
    id: 'accessoires', label: 'Accessoires',
    sub: [
      { id: 'acc-bijoux',    label: 'Bijoux' },
      { id: 'acc-montres',   label: 'Montres' },
      { id: 'acc-ceintures', label: 'Ceintures' },
      { id: 'acc-lunettes',  label: 'Lunettes' },
      { id: 'acc-chapeaux',  label: 'Chapeaux & casquettes' },
      { id: 'acc-echarpes',  label: 'Écharpes & foulards' },
      { id: 'acc-gants',     label: 'Gants' },
      { id: 'acc-cheveux',   label: 'Accessoires cheveux' },
      { id: 'acc-autres',    label: 'Autres accessoires' },
    ],
  },
  {
    id: 'sacs', label: 'Sacs',
    sub: [
      { id: 'sacs-main',          label: 'À main' },
      { id: 'sacs-bandouliere',   label: 'Bandoulière' },
      { id: 'sacs-dos',           label: 'À dos' },
      { id: 'sacs-cabas',         label: 'Cabas & tote' },
      { id: 'sacs-pochettes',     label: 'Pochettes' },
      { id: 'sacs-banane',        label: 'Bananes' },
      { id: 'sacs-valises',       label: 'Valises & sacs voyage' },
      { id: 'sacs-portefeuilles', label: 'Portefeuilles' },
      { id: 'sacs-trousses',      label: 'Trousses' },
    ],
  },
  {
    id: 'beaute', label: 'Beauté / Bien-être', navLabel: 'Beauté',
    sub: [
      { id: 'beaute-maquillage',  label: 'Maquillage' },
      { id: 'beaute-soins',       label: 'Soins du visage' },
      { id: 'beaute-cheveux',     label: 'Soins cheveux' },
      { id: 'beaute-corps',       label: 'Soin du corps' },
      { id: 'beaute-ongles',      label: 'Ongles & manucure' },
      { id: 'beaute-parfums',     label: 'Parfums' },
      { id: 'beaute-accessoires', label: 'Accessoires beauté' },
    ],
  },
  {
    id: 'electronique', label: 'Électronique',
    sub: [
      { id: 'elec-telephones',   label: 'Téléphones' },
      { id: 'elec-informatique', label: 'Informatique' },
      { id: 'elec-audio',        label: 'Audio' },
      { id: 'elec-jeuxvideo',    label: 'Jeux vidéo & consoles' },
      { id: 'elec-photo',        label: 'Photo & vidéo' },
      { id: 'elec-montres',      label: 'Montres connectées' },
      { id: 'elec-accessoires',  label: 'Accessoires & câbles' },
    ],
  },
  {
    id: 'animaux', label: 'Animaux',
    sub: [
      { id: 'animaux-accessoires', label: 'Accessoires & laisses' },
      { id: 'animaux-couchage',    label: 'Couchage & niches' },
      { id: 'animaux-gamelles',    label: 'Gamelles & distributeurs' },
      { id: 'animaux-cages',       label: 'Cages & aquariums' },
      { id: 'animaux-jouets',      label: 'Jouets' },
      { id: 'animaux-transport',   label: 'Transport & promenade' },
      { id: 'animaux-autres',      label: 'Autres' },
    ],
  },
  {
    id: 'livres-medias', label: 'Livres & médias', navLabel: 'Livres & médias',
    sub: [
      { id: 'livres-romans',   label: 'Romans & littérature' },
      { id: 'livres-bd',       label: 'BD, comics & mangas' },
      { id: 'livres-jeunesse', label: 'Jeunesse & enfants' },
      { id: 'livres-scolaire', label: 'Scolaire & études' },
      { id: 'livres-pratique', label: 'Loisirs & vie pratique' },
      { id: 'livres-art',      label: "Beaux-livres & art" },
      { id: 'media-cd',        label: 'CD & vinyles' },
      { id: 'media-dvd',       label: 'DVD & Blu-ray' },
      { id: 'media-presse',    label: 'Magazines & presse' },
    ],
  },
  {
    id: 'createurs', label: 'Fait main · Créateurs 974', navLabel: 'Créateurs',
    sub: [
      { id: 'crea-bijoux',       label: 'Bijoux & accessoires' },
      { id: 'crea-vetements',    label: 'Vêtements & textile' },
      { id: 'crea-deco',         label: 'Déco & maison' },
      { id: 'crea-beaute',       label: 'Savons & cosmétiques' },
      { id: 'crea-art',          label: 'Art & illustrations' },
      { id: 'crea-gourmandises', label: 'Gourmandises & épicerie' },
      { id: 'crea-autres',       label: 'Autres créations' },
    ],
  },
]

export const CONDITIONS = [
  { id: 'neuf_avec_etiquette', label: 'Neuf avec étiquette', desc: "Article neuf, jamais porté ou utilisé, avec son étiquette ou son emballage d'origine." },
  { id: 'neuf_sans_etiquette', label: 'Neuf sans étiquette', desc: "Article neuf, jamais porté ou utilisé, sans étiquette ni emballage d'origine." },
  { id: 'tres_bon_etat',       label: 'Très bon état',       desc: "Très peu porté ou utilisé, peut présenter de légères imperfections. Précise-les avec des photos et une description détaillée." },
  { id: 'bon_etat',            label: 'Bon état',            desc: "Porté ou utilisé quelques fois, présente des imperfections et des signes d'usure. Précise-les avec des photos et une description détaillée." },
  { id: 'etat_correct',        label: 'État correct',        desc: "Porté ou utilisé plusieurs fois, signes d'usure marqués. Précise les défauts avec des photos et une description détaillée." },
]

export const MATERIALS = [
  'Coton',
  'Lin',
  'Jean / Denim',
  'Laine',
  'Cuir',
  'Simili cuir',
  'Soie',
  'Polyester',
  'Viscose',
  'Nylon',
  'Velours',
  'Dentelle',
  'Maille',
  'Synthétique',
]

export const BRANDS = [
  "L'Effet Péi",
  "Superpolygone",
  "Vally",
  "Nike",
  "Zara",
  "H&M",
  "Adidas",
  "Shein",
  "Jennyfer",
  "Kiabi",
  "Pull&Bear",
  "Bershka",
  "Puma",
  "Levi's",
  "Lacoste",
]

// Couleurs et tailles — partagées entre le dépôt d'annonce (CreateListing) et la recherche.
// IMPORTANT : ces valeurs doivent rester identiques à ce qui est stocké en base.
export const COLORS = ['Blanc', 'Noir', 'Gris', 'Beige', 'Marron', 'Rouge', 'Rose', 'Orange', 'Jaune', 'Vert', 'Bleu', 'Violet', 'Multicolore']

export const SIZES_VETEMENTS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Unique']
export const SIZES_CHAUSSURES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
export const SIZES_ENFANT     = ['3 mois', '6 mois', '9 mois', '12 mois', '18 mois', '2 ans', '3 ans', '4 ans', '5 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans']

// Résout un slug d'URL (= id de catégorie) vers { root, sub } pour les pages /c/:slug.
// sub vaut null pour une racine ; renvoie null si le slug est inconnu.
export const findCategoryBySlug = (slug) => {
  if (!slug) return null
  const root = CATEGORIES.find(c => c.id === slug)
  if (root) return { root, sub: null }
  for (const c of CATEGORIES) {
    const sub = c.sub?.find(s => s.id === slug)
    if (sub) return { root: c, sub }
  }
  return null
}

// Tous les slugs racines (pour le sitemap / liens internes).
export const ROOT_CATEGORY_SLUGS = CATEGORIES.map(c => c.id)
