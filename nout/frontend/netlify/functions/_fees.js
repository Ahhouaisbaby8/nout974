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
  ubn_relay: 4, chrono_relay: 8.52,  // point relais (Chronopost = tarif officiel 8,52€ tout compris, 0-5kg)
  ubn_home: 6, chrono_home: 10.96,   // domicile (Chronopost express = tarif officiel 10,96€ tout compris, 0-3kg)
}
const COMMISSION_RATE  = 0.10   // 10 % du prix — protection acheteur (payée par l'acheteur)
const COMMISSION_FIXED = 0.25   // + 0,25 € fixe

// TAMPON FRAIS STRIPE SUR LE PORT. Stripe prélève ~1,5 % + 0,25 € sur le TOTAL (port compris), or la
// protection (10 % + 0,25 €) est calculée sur le seul prix de l'article → sans ce tampon, NOUT mange le
// ~1,5 % du port et peut perdre quelques centimes sur un article très bon marché EXPÉDIÉ. On ajoute donc
// 2 % du port à la protection payée par l'acheteur (couvre le 1,5 % Stripe avec une petite marge ;
// break-even exact ≈ 1,523 %). Nul en main propre (port 0). Miroir front : src/utils/shipping.js.
const SHIPPING_FEE_BUFFER_RATE = 0.02

// Frais de protection acheteur = 10 % + 0,25 €, AJOUTÉS au prix payé par l'acheteur.
function computeProtectionFee(price) {
  return Math.round((Number(price) * COMMISSION_RATE + COMMISSION_FIXED) * 100) / 100
}

// Tampon (en euros) couvrant les frais Stripe sur le port, pour un port donné. 0 si port nul (main propre).
function computeShippingFeeBuffer(port) {
  const p = Number(port) || 0
  return p > 0 ? Math.round(p * SHIPPING_FEE_BUFFER_RATE * 100) / 100 : 0
}

// Total ACHETEUR = prix + protection acheteur + port + tampon frais Stripe. (Recalcul serveur : ne jamais
// croire le client.) Le tampon est intégré à la protection (voir create-checkout-session.js).
function computeTotals(price, methodId) {
  const port = SHIPPING_FEES[methodId] ?? 0
  return Math.round((Number(price) + computeProtectionFee(price) + port + computeShippingFeeBuffer(port)) * 100) / 100
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
    const buffer        = computeShippingFeeBuffer(shippingFee)
    // Réconciliation avec le modèle en vigueur à la commande : AVEC tampon (commandes récentes) OU SANS
    // (commandes créées avant l'ajout du tampon +2 %). Dans les deux cas, l'acheteur récupère prix + port
    // et NOUT garde ses frais (protection [+ tampon]). On ne retient QUE si le total colle à un modèle connu
    // — sinon repli sur remboursement plein (sûr : on ne sous-rembourse jamais l'acheteur par erreur).
    const expectedWithBuffer    = payout + protectionFee + shippingFee + buffer
    const expectedWithoutBuffer = payout + protectionFee + shippingFee
    if (Math.abs(expectedWithBuffer - total) < 0.02 || Math.abs(expectedWithoutBuffer - total) < 0.02) {
      const refund = Math.round((payout + shippingFee) * 100) / 100   // prix + port : NOUT garde protection [+ tampon]
      const kept   = Math.round((total - refund) * 100) / 100
      return { amountCents: Math.max(0, Math.round(refund * 100)), keptProtection: kept, model: 'new' }
    }
  }
  // Ancien modèle / port non figé / incertitude → remboursement plein (sûr).
  return { amountCents: Math.max(0, Math.round(total * 100)), keptProtection: 0, model: 'legacy_full' }
}

module.exports = {
  SHIPPING_FEES, COMMISSION_RATE, COMMISSION_FIXED, SHIPPING_FEE_BUFFER_RATE,
  computeProtectionFee, computeShippingFeeBuffer, computeTotals, computeSellerPayout, computeRefundAmount,
}
