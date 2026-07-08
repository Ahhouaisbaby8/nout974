# 📋 NOTE POUR DAWSON — 7 juillet 2026 (finances / paiement = ta zone)

_Amandine devait sortir son CA de juin pour l'URSSAF. En cherchant, 2 vrais problèmes._

---

## 🐛 SUJET 1 — La page Admin/Finances mélange ventes TEST et RÉELLES

Amandine a fait BEAUCOUP de paiements avec la carte de test Stripe (4242…). Or la page
Admin/Finances (que j'ai améliorée : filtre année/mois/jour + ventes abouties) compte ces
ventes-test COMME du réel → le « Volume total payé = 124,75 € » et « Commission 11,86 € »
sont FAUX (gonflés par les tests).

**Cause** : les commandes ne stockent PAS de marqueur `livemode` (test vs réel). Le webhook
`stripe-webhook.js` a pourtant `stripeEvent.livemode` disponible, mais ne l'écrit pas sur la commande.

**Fix proposé (ta zone)** :
1. Ajouter une colonne `orders.livemode boolean` (ou `is_test`).
2. Dans `create-checkout-session.js` / `stripe-webhook.js`, écrire `livemode` depuis l'event Stripe.
3. Dans `Finances.jsx`, filtrer sur `livemode = true` (ne compter que le réel).
   (J'ai laissé la page prête : elle charge déjà les commandes abouties, il suffira d'ajouter le filtre.)

**En attendant** : pour l'URSSAF, Amandine utilise le rapport STRIPE en mode LIVE (Balance →
« Activité avant frais » = 9,80 € brut / 7,76 € net sur 6 juin→6 juil), qui sépare test/réel proprement.
La page NOUT n'est PAS fiable pour ça tant que le livemode n'est pas branché.

---

## 🐛 SUJET 2 — Commandes FANTÔMES qui s'accumulent (+ cron auto-refund ?)

Dans la liste des commandes, des lignes avec un « — » (pas de titre) = commandes `pending`
créées mais JAMAIS payées (paiement Stripe non abouti). Elles polluent l'affichage et faussent
les compteurs.

**Le code les nettoie DÉJÀ** : `auto-refund.js:50-70` annule les `pending` > 1h. SI ELLES
S'ACCUMULENT, c'est que le **cron auto-refund ne tourne pas** → ça rejoint le sujet crons déjà
signalé (auto-refund, chronopost-tracking, release-delivered à planifier + vérifier le déclenchement).

**Action immédiate** : Amandine va lancer `nout/NETTOYAGE-COMMANDES-FANTOMES.sql` (annule les
pending > 1h manuellement — sûr, ne touche aucune vraie vente). Mais le VRAI fix = s'assurer que
le cron auto-refund tourne, sinon ça reviendra.

**Lié** : le bug « Cet article est déjà en cours d'achat » (note précédente NOTE-POUR-DAWSON-07-07-checkout.md)
vient de ces mêmes pending non nettoyés qui bloquent un ré-achat. Nettoyer les pending + annuler
le pending à la fermeture du checkout = même famille de problème.

---

_TL;DR : (1) brancher `livemode` sur les commandes pour que Finances sépare test/réel (ta zone).
(2) Les commandes fantômes = cron auto-refund qui ne tourne pas → planifier les crons. Amandine
nettoie manuellement en attendant. Pour l'URSSAF elle prend le chiffre Stripe Live (9,80 € brut juin*)._
_*à ajuster sur la plage exacte 1→30 juin._
