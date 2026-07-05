// Source de vérité unique pour les modes de livraison + frais NOUT.
// Utilisé côté front (affichage tunnel d'achat + publication) ET côté backend (recalcul sécurisé).
//
// ─── MODÈLE TARIFAIRE (modèle « protection acheteur », façon Vinted) ──────────
// Le VENDEUR fixe son prix et le REÇOIT EN ENTIER : zéro frais déduit (« vends sans frais »).
// Les frais de service NOUT (10% + 0,25€) sont AJOUTÉS À L'ACHETEUR = « frais de protection acheteur ».
//   → L'ACHETEUR paie : prix affiché + protection (10% + 0,25€) + port éventuel.
//   → Le VENDEUR touche : le prix affiché, INTÉGRALEMENT (il met 15€ → il reçoit 15€).
//   → NOUT encaisse la protection, paie Stripe (1,5% + 0,25€) avec, et garde la différence (~8,5% du prix).
//      En main propre, NOUT est toujours gagnant. Seul cas marginal de perte de quelques centimes :
//      un article de 1 à 2 € expédié en livraison payante (le 1,5% Stripe sur le port n'est pas couvert)
//      — négligeable, et le prix minimum de 1 € au dépôt écarte les cas absurdes (0 € = sans paiement en ligne).
// Comparé à KazaKaz (15% prélevés AU VENDEUR) : ici le vendeur ne perd RIEN, et c'est l'acheteur
// qui paie une protection légère et transparente. Règle d'or NOUT : jamais de perte.
//
// La remise en main propre reste GRATUITE en PORT (port 0€). La protection acheteur, elle,
// s'applique à tous les modes — c'est elle qui finance le paiement sécurisé (séquestre).
//
// Port affiché = vrai tarif transporteur (NOUT ne marge pas sur le port : neutre, reversé au transporteur).

export const SHIPPING_METHODS = {
  hand: {
    id: 'hand',
    label: 'Remise en main propre',
    sublabel: 'Gratuit — paiement protégé par code',
    fee: 0,
    delay: null,
    recommended: true,
  },
  relay: {
    id: 'relay',
    label: 'Chronopost — Point relais',
    sublabel: 'Dépôt et retrait en point relais à La Réunion',
    fee: 6.51,
    delay: '1 à 2 jours ouvrés',
    recommended: false,
  },
  home: {
    id: 'home',
    label: 'Chronopost — Livraison à domicile',
    sublabel: 'Livraison chez toi par Chronopost',
    fee: 10.80,
    delay: '1 à 2 jours ouvrés',
    recommended: false,
  },
}

// ─── OPTIONS DE LIVRAISON MULTI-TRANSPORTEUR (checkout) ────────────────────────────
// L'acheteur choisit son transporteur (UBN ou Chronopost) + le mode. Chaque option porte
// son PORT et son transporteur. Les prix sont ceux confirmés (UBN moins cher). Ces valeurs
// DOIVENT rester alignées avec le recalcul serveur (_fees.js SHIPPING_FEES) — jamais croire le client.
//   carrier : 'ubn' | 'chronopost' | null (main propre)
//   mode    : mode transporteur ('relais' | 'home'/'express') — sert à la création d'étiquette
//   needsRelay   : affiche le sélecteur de point relais du transporteur choisi
//   needsAddress : exige l'adresse de livraison de l'acheteur
export const DELIVERY_OPTIONS = [
  { id: 'hand',         carrier: null,         mode: 'hand',    label: 'Remise en main propre',      sublabel: 'Gratuit — paiement protégé par code',  fee: 0,     delay: null,          needsRelay: false, needsAddress: false, recommended: true },
  { id: 'ubn_relay',    carrier: 'ubn',        mode: 'relais',  label: 'Point relais — UBN',         sublabel: 'Retrait en point relais · sous 48/72h', fee: 4,     delay: 'Sous 48/72h', needsRelay: true,  needsAddress: false },
  { id: 'chrono_relay', carrier: 'chronopost', mode: 'relais',  label: 'Point relais — Chronopost',  sublabel: 'Retrait en point relais Chronopost',    fee: 8.52,  delay: '1 à 2 j ouvrés', needsRelay: true,  needsAddress: false },
  { id: 'ubn_home',     carrier: 'ubn',        mode: 'home',    label: 'Domicile — UBN',             sublabel: 'Livraison chez toi · sous 48/72h',      fee: 6,     delay: 'Sous 48/72h', needsRelay: false, needsAddress: true },
  { id: 'chrono_home',  carrier: 'chronopost', mode: 'express', label: 'Domicile — Chronopost',      sublabel: 'Livraison express chez toi',            fee: 10.96, delay: '1 à 2 j ouvrés', needsRelay: false, needsAddress: true },
]

// Ordre d'affichage (main propre en premier, puis du moins cher au plus cher)
export const DELIVERY_ORDER = DELIVERY_OPTIONS.map((o) => o.id)

// Retrouve une option par id (repli sur main propre si inconnu).
export const getDeliveryOption = (id) => DELIVERY_OPTIONS.find((o) => o.id === id) ?? DELIVERY_OPTIONS[0]

// Port d'une option de livraison. Repli sur l'ancien modèle (relay/home) pour les commandes existantes.
export const getDeliveryFee = (id) => {
  const opt = DELIVERY_OPTIONS.find((o) => o.id === id)
  if (opt) return opt.fee
  return SHIPPING_METHODS[id]?.fee ?? 0
}

// Port de livraison LE MOINS CHER (hors main propre gratuite) — pour l'affichage
// « livraison à partir de X € ». Aujourd'hui : UBN point relais à 4 €.
export const MIN_SHIPPING_FEE = Math.min(
  ...DELIVERY_OPTIONS.filter((o) => o.fee > 0).map((o) => o.fee)
)

// Frais de service NOUT, AJOUTÉS À L'ACHETEUR (protection acheteur) : taux variable + part fixe.
export const COMMISSION_RATE = 0.10   // 10 % du prix
export const COMMISSION_FIXED = 0.25  // + 0,25 € fixe

// Liste ordonnée pour l'affichage (ancien modèle — conservé pour compat)
export const SHIPPING_ORDER = ['hand', 'relay', 'home']

const method = (methodId) => SHIPPING_METHODS[methodId] ?? SHIPPING_METHODS.hand

// Frais de port d'un mode (0 = main propre)
export const getShippingFee = (methodId) => method(methodId).fee

// Frais de protection acheteur = 10 % du prix + 0,25 € — AJOUTÉS à l'acheteur (façon Vinted).
// C'est sur ce montant que NOUT paie Stripe puis garde sa marge ; il couvre toujours Stripe.
export const computeProtectionFee = (price) =>
  Math.round((Number(price) * COMMISSION_RATE + COMMISSION_FIXED) * 100) / 100

// Ce que TOUCHE LE VENDEUR = le PRIX AFFICHÉ, intégralement.
// Les frais sont payés par l'acheteur (protection), donc rien n'est déduit du vendeur.
export const computeSellerPayout = (price) =>
  Math.round(Number(price) * 100) / 100

// Total payé par l'ACHETEUR = prix + protection acheteur (10 % + 0,25 €) + port éventuel.
// Accepte aussi bien un id d'option de livraison ('ubn_relay'…) qu'un ancien mode ('relay').
export const computeBuyerTotal = (price, methodId = 'hand') => {
  const total = Number(price) + computeProtectionFee(price) + getDeliveryFee(methodId)
  return Math.round(total * 100) / 100
}
