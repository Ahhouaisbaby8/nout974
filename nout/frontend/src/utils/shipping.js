// Source de vérité unique pour les modes de livraison NOUT.
// Utilisé côté front (affichage tunnel d'achat) ET côté backend (recalcul sécurisé du total).
//
// PRINCIPE : NOUT n'a pas de trésorerie → ZÉRO perte autorisée sur un colis.
// Le coût Chronopost est entièrement couvert par une Protection acheteur majorée EN LIVRAISON.
// La remise en main propre reste gratuite (protection normale) = option principale, imbattable.
//
// Coût réel facturé à NOUT par Chronopost (fin de mois selon volume) :
//   - Point relais (Relais DOM) : 8,52€  → port affiché 4,99€, le reste couvert par la protection
//   - Domicile (Express)        : 10,96€ → port affiché 8,90€, idem
//
// Frais de service / Protection acheteur :
//   - Main propre : 5% + 1,00€  (gross-up Stripe inclus) → NOUT touche 5%+1€ net
//   - Livraison   : 5% + 3,40€  → la part fixe majorée (+2,40€) couvre le coût Chronopost restant
//                   après le port encaissé, de sorte que NOUT ne perde jamais.

export const SHIPPING_METHODS = {
  hand: {
    id: 'hand',
    label: 'Remise en main propre',
    sublabel: 'Gratuit — paiement protégé par code',
    fee: 0,
    protectionFixed: 1.00,   // frais de service fixe (€) — la part variable 5% s'ajoute
    delay: null,
    recommended: true,
  },
  relay: {
    id: 'relay',
    label: 'Chronopost — Point relais',
    sublabel: 'Dépôt et retrait en point relais à La Réunion',
    fee: 6.49,
    protectionFixed: 3.49,
    delay: '1 à 2 jours ouvrés',
    recommended: false,
  },
  home: {
    id: 'home',
    label: 'Chronopost — Livraison à domicile',
    sublabel: 'Livraison chez toi par Chronopost',
    fee: 8.90,
    protectionFixed: 3.49,
    delay: '1 à 2 jours ouvrés',
    recommended: false,
  },
}

// Taux de commission variable NOUT (identique sur tous les modes)
export const COMMISSION_RATE = 0.05

// Liste ordonnée pour l'affichage (main propre en premier = mise en avant)
export const SHIPPING_ORDER = ['hand', 'relay', 'home']

const method = (methodId) => SHIPPING_METHODS[methodId] ?? SHIPPING_METHODS.hand

// Frais de port d'un mode (0 = main propre)
export const getShippingFee = (methodId) => method(methodId).fee

// Frais de service / Protection acheteur pour ce mode, après gross-up Stripe (1,5% + 0,25€).
// = (prix×(1+taux) + fixe + 0,25) / 0,985 − prix
export const computeProtectionFee = (price, methodId = 'hand') => {
  const fixe = method(methodId).protectionFixed
  const fee = (price * (1 + COMMISSION_RATE) + fixe + 0.25) / 0.985 - price
  return Math.round(fee * 100) / 100
}

// Total payé par l'acheteur = prix article + protection (grossée-up) + port.
export const computeBuyerTotal = (price, methodId = 'hand') => {
  const total = price + computeProtectionFee(price, methodId) + getShippingFee(methodId)
  return Math.round(total * 100) / 100
}
