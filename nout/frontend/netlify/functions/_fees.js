// SOURCE UNIQUE des frais NOUT (côté serveur). Importé par create-checkout-session.js (calcul du total
// acheteur / du versement vendeur) et par les chemins de remboursement (auto-refund.js, admin-actions.js).
// DOIT rester synchronisé avec src/utils/shipping.js (source de vérité front).
//
// MODÈLE « protection acheteur » (façon Vinted) : le VENDEUR reçoit son prix EN ENTIER. Les frais NOUT
// (10 % + 0,25 €) sont AJOUTÉS À L'ACHETEUR ; NOUT paie Stripe avec et garde le reste (~8,5 %).

// Port par option de livraison. `hand`/`relay`/`home` = anciens ids (commandes existantes, compat).
// `ubn_*`/`chrono_*` = nouvelles options multi-transporteur (checkout). DOIT rester aligné avec
// src/utils/shipping.js (DELIVERY_OPTIONS). Le serveur recalcule TOUJOURS le port depuis cette table.
const SHIPPING_FEES    = {
  hand: 0,
  relay: 6.51, home: 10.80,          // anciens ids (compat)
  ubn_relay: 4, chrono_relay: 6.51,  // point relais
  ubn_home: 6, chrono_home: 10.80,   // domicile
}
const COMMISSION_RATE  = 0.10   // 10 % du prix — protection acheteur (payée par l'acheteur)
const COMMISSION_FIXED = 0.25   // + 0,25 € fixe

// Frais de protection acheteur = 10 % + 0,25 €, AJOUTÉS au prix payé par l'acheteur.
function computeProtectionFee(price) {
  return Math.round((Number(price) * COMMISSION_RATE + COMMISSION_FIXED) * 100) / 100
}

// Total ACHETEUR = prix + protection acheteur + port. (Recalcul serveur : ne jamais croire le client.)
function computeTotals(price, methodId) {
  const port = SHIPPING_FEES[methodId] ?? 0
  return Math.round((Number(price) + computeProtectionFee(price) + port) * 100) / 100
}

// Versement vendeur = le PRIX AFFICHÉ, intégralement (les frais sont payés par l'acheteur).
function computeSellerPayout(price) {
  return Math.round(Number(price) * 100) / 100
}

// Montant à REMBOURSER à l'acheteur, en CENTIMES (pour stripe.refunds.create({ amount })).
//
// OPTION A (décision NOUT) : sur un remboursement, NOUT GARDE TOUJOURS ses frais de protection → il ne
// perd jamais sa marge. L'acheteur récupère donc le prix + le port, mais pas la protection.
//   refund = total_price − protection(seller_payout)
//
// GARDE-FOU anciennes commandes : on ne retient la protection QUE si la commande colle au NOUVEAU modèle.
// La détection s'appuie sur le PORT FIGÉ à la commande (order.shipping_fee), écrit au checkout — JAMAIS
// sur la table de tarifs courante (sinon un changement de tarif transporteur, ou un mode de livraison
// inconnu, reclasserait à tort une commande neuve en 'legacy_full' et NOUT rendrait sa protection).
// Une commande sans shipping_fee (créée avant l'ajout de la colonne) → remboursement PLEIN (sûr : on ne
// sous-rembourse jamais l'acheteur par erreur).
//
// Renvoie { amountCents, keptProtection, model }.
function computeRefundAmount(order) {
  const total       = Number(order?.total_price ?? 0)
  const payout      = order?.seller_payout != null ? Number(order.seller_payout) : null
  const shippingFee = order?.shipping_fee != null ? Number(order.shipping_fee) : null

  if (payout != null && payout > 0 && total > 0 && shippingFee != null) {
    const protectionFee = computeProtectionFee(payout)
    const expectedTotal = payout + protectionFee + shippingFee
    if (Math.abs(expectedTotal - total) < 0.02) {
      const refund = Math.round((total - protectionFee) * 100) / 100   // = payout + port : on garde la protection
      return { amountCents: Math.max(0, Math.round(refund * 100)), keptProtection: protectionFee, model: 'new' }
    }
  }
  // Ancien modèle / port non figé / incertitude → remboursement plein (sûr).
  return { amountCents: Math.max(0, Math.round(total * 100)), keptProtection: 0, model: 'legacy_full' }
}

module.exports = {
  SHIPPING_FEES, COMMISSION_RATE, COMMISSION_FIXED,
  computeProtectionFee, computeTotals, computeSellerPayout, computeRefundAmount,
}
