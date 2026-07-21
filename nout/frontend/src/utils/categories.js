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
      { id: 'femme-pantalons',       label: 'Pantalons' },
      { id: 'femme-jeans-skinny',    label: 'Jeans skinny' },
      { id: 'femme-jeans-slim',      label: 'Jeans slim' },
      { id: 'femme-jeans-droit',     label: 'Jeans coupe droite' },
      { id: 'femme-jeans-large',     label: 'Jeans large / mom' },
      { id: 'femme-jeans-troue',     label: 'Jeans troués' },
      { id: 'femme-shorts',          label: 'Shorts' },
      { id: 'femme-combinaisons',    label: 'Combinaisons' },
      { id: 'femme-manteaux',        label: 'Manteaux, vestes & blousons' },
      { id: 'femme-blazers',         label: 'Blazers & tailleurs' },
      { id: 'femme-maillots',        label: 'Maillots de bain' },
      { id: 'femme-lingerie',        label: 'Lingerie & pyjamas' },
      { id: 'femme-sport',           label: 'Vêtements de sport' },
      { id: 'femme-grossesse',       label: 'Grossesse' },
      { id: 'femme-grandes-tailles', label: 'Grandes tailles' },
      { id: 'femme-lots',            label: 'Lots de vêtements' },
    ],
  },
  {
    id: 'vetements-homme', label: 'Vêtements homme', navLabel: 'Homme',
    sub: [
      { id: 'homme-hauts',         label: 'Hauts & t-shirts' },
      { id: 'homme-chemises',      label: 'Chemises & polos' },
      { id: 'homme-sweats',        label: 'Sweats & pulls' },
      { id: 'homme-gilets',        label: 'Gilets & cardigans' },
      { id: 'homme-pantalons',     label: 'Pantalons' },
      { id: 'homme-jeans-skinny',  label: 'Jeans skinny' },
      { id: 'homme-jeans-slim',    label: 'Jeans slim' },
      { id: 'homme-jeans-droit',   label: 'Jeans coupe droite' },
      { id: 'homme-jeans-large',   label: 'Jeans large' },
      { id: 'homme-jeans-troue',   label: 'Jeans troués' },
      { id: 'homme-shorts',        label: 'Shorts' },
      { id: 'homme-manteaux',      label: 'Manteaux, vestes & blousons' },
      { id: 'homme-costumes',      label: 'Costumes & blazers' },
      { id: 'homme-maillots',      label: 'Maillots de bain' },
      { id: 'homme-sport',         label: 'Vêtements de sport' },
      { id: 'homme-pyjamas',       label: 'Pyjamas & homewear' },
      { id: 'homme-sousvetements', label: 'Sous-vêtements & chaussettes' },
      { id: 'homme-lots',          label: 'Lots de vêtements' },
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
      { id: 'enfant-manteaux',      label: 'Manteaux, vestes & blousons' },
      { id: 'enfant-pyjamas',       label: 'Pyjamas' },
      { id: 'enfant-maillots',      label: 'Maillots de bain' },
      { id: 'enfant-sousvetements', label: 'Sous-vêtements & chaussettes' },
      { id: 'enfant-ceremonie',     label: 'Tenues de cérémonie' },
      { id: 'enfant-deguisements',  label: 'Déguisements' },
      { id: 'enfant-lots',          label: 'Lots de vêtements' },
    ],
  },
  {
    id: 'vetements-mixte', label: 'Mode mixte / Unisexe', navLabel: 'Mixte',
    sub: [
      { id: 'mixte-hauts',       label: 'Hauts & t-shirts' },
      { id: 'mixte-sweats',      label: 'Sweats & hoodies' },
      { id: 'mixte-pulls',       label: 'Pulls & gilets' },
      { id: 'mixte-chemises',    label: 'Chemises' },
      { id: 'mixte-pantalons',   label: 'Pantalons & jeans' },
      { id: 'mixte-shorts',      label: 'Shorts' },
      { id: 'mixte-manteaux',    label: 'Manteaux, vestes & blousons' },
      { id: 'mixte-sport',       label: 'Vêtements de sport' },
      { id: 'mixte-maillots',    label: 'Maillots de bain' },
      { id: 'mixte-accessoires', label: 'Accessoires (casquettes, écharpes…)' },
      { id: 'mixte-lots',        label: 'Lots de vêtements' },
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
    id: 'sport-plein-air', label: 'Sport & plein air', navLabel: 'Sport',
    sub: [
      { id: 'sport-velos',        label: 'Vélos' },
      { id: 'sport-trottinettes', label: 'Trottinettes' },
      { id: 'sport-fitness',      label: 'Fitness & musculation' },
      { id: 'sport-rando',        label: 'Randonnée & camping' },
      { id: 'sport-eau',          label: "Surf & sports d'eau" },
      { id: 'sport-collectifs',   label: 'Sports collectifs' },
      { id: 'sport-accessoires',  label: 'Accessoires & équipement' },
      { id: 'sport-autres',       label: 'Autres' },
    ],
  },
  {
    id: 'loisirs-collections', label: 'Loisirs & collections', navLabel: 'Loisirs',
    sub: [
      { id: 'loisirs-cartes',       label: 'Cartes à collectionner' },
      { id: 'loisirs-voitures',     label: 'Voitures miniatures & modèles réduits' },
      { id: 'loisirs-maquettes',    label: 'Maquettes & Lego' },
      { id: 'loisirs-jeux-societe', label: 'Jeux de société' },
      { id: 'loisirs-puzzles',      label: 'Puzzles' },
      { id: 'loisirs-plateau',      label: 'Jeux de plateau & miniatures' },
      { id: 'loisirs-souvenirs',    label: 'Souvenirs' },
      { id: 'loisirs-instruments',  label: 'Instruments de musique' },
      { id: 'loisirs-creatifs',     label: 'Loisirs créatifs' },
      { id: 'loisirs-accessoires',  label: 'Accessoires de jeux' },
    ],
  },
  {
    id: 'vehicules', label: 'Véhicules', navLabel: 'Véhicules',
    // MISE EN RELATION uniquement : PAS de paiement NOUT (voir migration 20260721_listings_sale_mode).
    // Le paiement + la remise se font en direct entre acheteur et vendeur (comme Leboncoin/LaCentrale).
    // Le flag ci-dessous n'est qu'indicatif côté front : la source de vérité est listings.sale_mode
    // (imposé par un trigger base) + la garde serveur dans create-checkout-session.js.
    saleMode: 'contact',
    sub: [
      { id: 'vehic-voitures',    label: 'Voitures' },
      { id: 'vehic-motos',       label: 'Motos & scooters' },
      { id: 'vehic-utilitaires', label: 'Utilitaires & camions' },
      { id: 'vehic-quads',       label: 'Quads & buggys' },
      { id: 'vehic-nautisme',    label: 'Bateaux & jet-skis' },
      { id: 'vehic-remorques',   label: 'Remorques' },
      { id: 'vehic-autres',      label: 'Autres véhicules' },
    ],
  },
  {
    id: 'pieces-auto', label: 'Pièces & accessoires auto', navLabel: 'Pièces auto',
    sub: [
      { id: 'piece-jantes',      label: 'Jantes & pneus' },
      { id: 'piece-interieur',   label: 'Sièges & intérieur' },
      { id: 'piece-moteur',      label: 'Moteur & mécanique' },
      { id: 'piece-carrosserie', label: 'Carrosserie & optiques' },
      { id: 'piece-audio',       label: 'Audio & électronique' },
      { id: 'piece-accessoires', label: 'Accessoires & équipement' },
      { id: 'piece-autres',      label: 'Autres pièces' },
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

// Marques : les 3 marques locales 974 en tête, puis les marques les plus courantes
// (fast-fashion, sport, mid-range, quelques premium) par ordre alphabétique. « Autre »
// reste géré séparément dans le formulaire (saisie libre) pour tout ce qui manque.
export const BRANDS = [
  "L'Effet Péi",
  "Superpolygone",
  "Vally",
  "Adidas",
  "Armani",
  "Asics",
  "Balenciaga",
  "Bershka",
  "Bonobo",
  "Burberry",
  "Calvin Klein",
  "Camaïeu",
  "Carhartt",
  "Celio",
  "Champion",
  "Chanel",
  "Converse",
  "Decathlon",
  "Desigual",
  "Diesel",
  "Dior",
  "Dr. Martens",
  "Ellesse",
  "Esprit",
  "Fila",
  "Gap",
  "Gémo",
  "Guess",
  "Gucci",
  "H&M",
  "Hollister",
  "Hugo Boss",
  "IKKS",
  "Jack & Jones",
  "Jennyfer",
  "Jordan",
  "Jules",
  "Kaporal",
  "Kappa",
  "Kenzo",
  "Kiabi",
  "Lacoste",
  "La Halle",
  "Levi's",
  "Louis Vuitton",
  "Mango",
  "Michael Kors",
  "Morgan",
  "Naf Naf",
  "New Balance",
  "New Era",
  "Nike",
  "North Face",
  "Only",
  "Petit Bateau",
  "Pimkie",
  "Primark",
  "Promod",
  "Pull&Bear",
  "Puma",
  "Quechua",
  "Ralph Lauren",
  "Reebok",
  "Sandro",
  "Sézane",
  "Shein",
  "Stradivarius",
  "Superdry",
  "Timberland",
  "Tommy Hilfiger",
  "Uniqlo",
  "Vans",
  "Vero Moda",
  "Zadig & Voltaire",
  "Zara",
]

// Couleurs et tailles — partagées entre le dépôt d'annonce (CreateListing) et la recherche.
// IMPORTANT : ces valeurs doivent rester identiques à ce qui est stocké en base.
// Couleurs — liste ordonnée (neutres → chaudes → froides), façon Vinted. Source UNIQUE
// (avant : dupliquée en local dans CreateListing/EditListing). Le vendeur peut en choisir 2 max.
export const COLORS = [
  'Blanc', 'Crème', 'Beige', 'Gris', 'Noir', 'Marron', 'Kaki',
  'Rouge', 'Bordeaux', 'Corail', 'Orange', 'Moutarde', 'Jaune', 'Doré', 'Argenté',
  'Rose', 'Fuchsia', 'Violet', 'Lila',
  'Bleu clair', 'Bleu', 'Marine', 'Turquoise', 'Menthe', 'Vert', 'Vert foncé',
  'Multicolore',
]

// Pastille (couleur d'affichage) pour chaque nom — aide au repérage visuel (accessibilité).
// 'multicolore' = valeur sentinelle → dégradé arc-en-ciel côté composant.
export const COLOR_SWATCHES = {
  'Blanc': '#FFFFFF', 'Crème': '#F3ECDD', 'Beige': '#D8C4A0', 'Gris': '#9CA3AF',
  'Noir': '#1B1B1B', 'Marron': '#5A3A22', 'Kaki': '#78785A',
  'Rouge': '#D62828', 'Bordeaux': '#6E1423', 'Corail': '#FF7F6B', 'Orange': '#F57C00',
  'Moutarde': '#D4A017', 'Jaune': '#F4D03F', 'Doré': '#C6A03C', 'Argenté': '#C4C7CC',
  'Rose': '#F5A9BC', 'Fuchsia': '#E4187E', 'Violet': '#7A2E8C', 'Lila': '#C8A2D8',
  'Bleu clair': '#8FCDE8', 'Bleu': '#1E7FD0', 'Marine': '#26305F', 'Turquoise': '#A6DAD6',
  'Menthe': '#B7EFCB', 'Vert': '#2F9E52', 'Vert foncé': '#2C4A33',
  'Multicolore': 'multicolore',
}

export const SIZES_VETEMENTS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Unique']
export const SIZES_CHAUSSURES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
export const SIZES_ENFANT     = ['3 mois', '6 mois', '9 mois', '12 mois', '18 mois', '2 ans', '3 ans', '4 ans', '5 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans']

// Équivalences de tailles vêtement (Intl → FR / US-UK) — affichées en LIBELLÉ pour aider au choix.
// La VALEUR stockée reste la taille de base (ex. 'M') → aucun impact sur le stockage ni le filtre recherche.
export const SIZE_EQUIV = {
  'XS': '34 / 6', 'S': '36 / 8', 'M': '38 / 10', 'L': '40 / 12',
  'XL': '42 / 14', 'XXL': '44 / 16', '3XL': '46 / 18',
}
export const sizeLabel = (s) => (SIZE_EQUIV[s] ? `${s} · ${SIZE_EQUIV[s]}` : s)

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

// Annonce en « mise en relation » (PAS de paiement NOUT) = un VÉHICULE. Détection robuste : catégorie
// racine 'vehicules', ou tout id véhicule 'vehic-*' (sous-catégorie / typo / casse). DOIT rester cohérent
// avec le trigger SQL (20260721_listings_sale_mode) ET la garde serveur create-checkout-session.js.
// NB : la source de vérité argent reste `listings.sale_mode` (base) + la garde serveur ; ce helper ne
// sert qu'à l'affichage/redirection côté front.
export const isContactCategory = (category, subcategory) => {
  const norm = (s) => String(s ?? '').trim().toLowerCase()
  const c = norm(category), s = norm(subcategory)
  return c === 'vehicules' || c.startsWith('vehic-') || s.startsWith('vehic-')
}
