// Source de vérité unique pour les modes de livraison + frais NOUT.
// Utilisé côté front (affichage tunnel d'achat + publication) ET côté backend (recalcul sécurisé).
//
// ─── MODÈLE TARIFAIRE (décidé 27 juin 2026, face à KazaKaz) ───────────────────
// KazaKaz prélève 15% SUR LE VENDEUR (frais inclus dans le prix affiché).
// NOUT fait mieux : frais NOUT = 10% + 0,25€, prélevés SUR LE VENDEUR aussi.
//   → L'ACHETEUR paie le PRIX AFFICHÉ + le port (aucun frais de service ajouté visible).
//   → Le VENDEUR touche : prix − (10% + 0,25€) − frais Stripe sur l'encaissement.
//   → NOUT garde 10% + 0,25€ NET (le 0,25€ couvre juste le fixe Stripe → ZÉRO perte, on ne marge pas dessus).
// Résultat vs KazaKaz : frais NOUT ÉGAUX ou MOINS chers dès 5€ (10€→1,25€ vs 1,50€ Kaza ;
// 20€→2,25€ vs 3€ ; 30€→3,25€ vs 4,50€). Seul un article à 3€ est ~0,10€ + cher (Stripe incompressible).
// Règle d'or NOUT : jamais de perte.
//
// La remise en main propre reste GRATUITE (port 0€) = arme imbattable vs KazaKaz
// (eux obligent à payer le port même en intra-île).
//
// Port affiché = vrai tarif transporteur (NOUT ne marge pas sur le port, il est neutre :
// reversé au transporteur ; la formule garantit que NOUT garde sa marge malgré Stripe).

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

// Frais NOUT prélevés sur le VENDEUR : taux variable + part fixe.
export const COMMISSION_RATE = 0.10   // 10 % du prix
export const COMMISSION_FIXED = 0.25  // + 0,25 € fixe (couvre le fixe Stripe, pas de marge dessus)

// Frais Stripe (pour le gross-up) — 1,5 % + 0,25 € par transaction.
const STRIPE_PCT = 0.015
const STRIPE_FIX = 0.25

// Liste ordonnée pour l'affichage (main propre en premier = mise en avant)
export const SHIPPING_ORDER = ['hand', 'relay', 'home']

const method = (methodId) => SHIPPING_METHODS[methodId] ?? SHIPPING_METHODS.hand

// Frais de port d'un mode (0 = main propre)
export const getShippingFee = (methodId) => method(methodId).fee

// Frais NOUT NET visés sur un article (ce que NOUT garde après Stripe) = 10% + 0,25€.
export const computeNoutFee = (price) =>
  Math.round((price * COMMISSION_RATE + COMMISSION_FIXED) * 100) / 100

// Ce que TOUCHE LE VENDEUR = prix − frais NOUT − frais Stripe sur l'encaissement total.
// Le total encaissé (prix + port) est taxé par Stripe ; NOUT couvre cette taxe avant de
// garder sa marge nette, donc elle est déduite du versement vendeur.
export const computeSellerPayout = (price, methodId = 'hand') => {
  const port = getShippingFee(methodId)
  const stripe = (price + port) * STRIPE_PCT + STRIPE_FIX
  const payout = price - computeNoutFee(price) - stripe
  return Math.round(payout * 100) / 100
}

// Total payé par l'ACHETEUR = prix affiché + port (aucun frais de service ajouté).
export const computeBuyerTotal = (price, methodId = 'hand') => {
  const total = price + getShippingFee(methodId)
  return Math.round(total * 100) / 100
}
