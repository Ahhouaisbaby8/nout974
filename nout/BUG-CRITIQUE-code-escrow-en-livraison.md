# 🔴 BUG CRITIQUE POUR DAWSON — code escrow généré/validable en LIVRAISON (14/07)

_Découvert pendant le test Chronopost réel St-Denis→St-Benoît. Le test est CASSÉ par ce bug._
_Zone paiement/escrow = ta zone. À corriger avant tout lancement (mélange livraison ↔ main propre)._

## 🐛 SYMPTÔME OBSERVÉ (test réel)
- Achat en **Livraison point relais Chronopost** (article Nike, 9,87€ payé).
- Le mail ACHETEUR affiche **« TON CODE DE REMISE : 726120 »** + « donne ce code au vendeur ».
  → FAUX en livraison : il ne doit PAS y avoir de code (c'est le suivi transporteur qui valide).
- Le mail VENDEUR (stripe-webhook.js:238) dit aussi « l'acheteur te donnera un code à 6 chiffres »
  même en livraison → FAUX.
- Résultat : la commande est passée en **`payout_pending`** (« Virement en attente ») AVANT toute
  expédition. Du coup le panneau « Générer l'étiquette » a DISPARU côté vendeur
  (Orders.jsx:186 : `SellerShippingPanel` ne s'affiche QUE si `order.status === 'paid'`).
  → **Le vendeur ne peut plus générer le bordereau. Test bloqué.**

## 🔍 CAUSE RACINE
1. `create-checkout-session.js:255` génère un `escrowCode` (6 chiffres) + l'insère dans `escrow_codes`
   **INCONDITIONNELLEMENT**, même quand `isDelivery === true` (la variable existe déjà ligne 103 mais
   n'est pas utilisée pour conditionner le code).
2. `stripe-webhook.js:237-239` envoie les mails avec le code même en livraison.
3. Ce code peut être VALIDÉ (confirm-escrow.js) → déclenche `releaseSellerPayout` → versement.
   Comme le vendeur n'a pas de compte Stripe KYC (_payout.js:109-113) → statut `payout_pending`.
   → Le flux LIVRAISON (étiquette → dépôt → suivi → delivered → +48h → paiement) est
   COURT-CIRCUITÉ par le flux MAIN PROPRE (code). Les deux se mélangent.

## ✅ CE QUI EST ATTENDU
- **Main propre** (hand) : code à 6 chiffres. Le vendeur saisit le code → payé. OK.
- **Livraison** (relay/home) : AUCUN code. Flux = vendeur génère étiquette → status `shipped` →
  cron chronopost-tracking pose `delivered` → release-delivered paie à +48h. (Déjà codé, marche.)

## 🔧 FIX PROPOSÉ (à valider par toi)
1. `create-checkout-session.js` : ne générer/insérer le code escrow QUE si `!isDelivery`
   (main propre uniquement). En livraison, pas de ligne dans `escrow_codes`.
2. `stripe-webhook.js` : en livraison, mails SANS code. Texte acheteur = « Ton paiement est protégé ;
   il se débloque automatiquement à la livraison + 48h, rien à faire ». Texte vendeur = « Génère
   l'étiquette dans Mes commandes, dépose le colis ; tu es payé automatiquement après livraison ».
3. Vérifier que `confirm-escrow` refuse de valider un code pour une commande en livraison (garde-fou).
4. ⚠️ La commande de TEST actuelle est coincée en `payout_pending` non expédiée → à remettre en `paid`
   à la main (SQL) pour que le vendeur puisse tester la génération d'étiquette. Requête :
   `UPDATE orders SET status='paid' WHERE id='<order_id>' AND status='payout_pending';`
   (à faire prudemment, en vérifiant qu'aucun transfert Stripe n'est réellement parti.)

## 📌 IMPACT
Sans ce fix : toute vente en livraison peut être court-circuitée par le code, le paiement se
déclenche avant l'expédition, et le vendeur ne peut pas générer l'étiquette. Bloquant pour le
lancement. Amandine a bien vu le problème ("le code n'est pas nécessaire en livraison" — exact).
