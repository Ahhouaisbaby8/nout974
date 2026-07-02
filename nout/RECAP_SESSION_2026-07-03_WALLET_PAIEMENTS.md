# RÉCAP SESSION — Wallet / Paiements NOUT (1er–3 juillet 2026)

Marketplace seconde main 974. Repo `Ahhouaisbaby8/nout974`, branche `master`. Frontend : `nout/frontend`.
Push sur master → Netlify déploie tout seul. Migrations SQL = à lancer À LA MAIN dans Supabase (SQL Editor).
Stripe = compte **amandine.megarisse@gmail.com** (LIVE, vrai argent), compte plateforme `acct_1TfJ4OLLmfUYCFZe`.

## DÉCISION STRUCTURANTE : modèle PORTE-MONNAIE sur Stripe Connect
- On **RESTE sur Stripe** (Mangopay envisagé mais sur devis/trop lent). **Stripe marche pour un PARTICULIER SANS SIRET** — confirmé 2× en réel (compte Awso + un compte neuf : arrivés au récap Stripe sans qu'on demande de SIRET).
- Le libellé Stripe « Entrepreneur individuel » = **juste une étiquette technique** pour un particulier ; ça n'inscrit personne, aucune obligation.
- **Wallet** : comptes connectés Express en **payout `manual`** → l'argent des ventes s'accumule dans le solde du compte connecté (le « porte-monnaie »), et le vendeur le vire à sa banque via **« Mon argent » → Retirer** (`request-payout.js`).
- **LÉGAL** : détenir/reverser des fonds de tiers = activité régulée → doit passer par un PSP agréé (Stripe). Ne JAMAIS copier KazaKaz (collecte IBAN + PayPal soi-même = illégal, risque pénal). Le « solde » affiché par NOUT = simple vue au-dessus du solde Stripe.

## MODÈLE DE FRAIS (vérifié OK)
`_fees.js` = source unique. protection = `round(prix*0.10 + 0.25)`. Vendeur reçoit le **prix plein**. Acheteur paie prix + protection + port. NOUT garde la protection − frais Stripe.
Marge nette NOUT ≈ **+0,08 € à 1 €** (fine), **+0,83 € à 10 €**, **+1,67 € à 20 €**, **+4,17 € à 50 €**. Toujours positif. Question ouverte : garder le prix mini à 1 € ou le monter (marge fine sur les tout petits articles).

## COMMITS POUSSÉS (master) cette session
- `94e0e93` wallet (create-connect-account payout manuel + auto-répar + bouton, request-payout, wallet-balance, sweep-wallets cron 90j, MyMoney, Settings nettoyé, menu, démo retirée)
- `5c9b41e` wallet-balance ne plante plus si solde illisible
- `8049cc7` texte « Entrepreneur individuel = particulier » + retour onboarding sur /compte/paiements
- `039d34d` + `e6a22b7` sous-page Stripe EMBARQUÉE → **ANNULÉE** par `4ce5406` (trop complexe, besoin clé publique navigateur ; retour à la REDIRECTION simple qui marche)
- `9bf5628` + `ef2ad8c` FAQ + chatbot : comment retirer (wallet) + « ça pose problème aux impôts ? » (ton positif honnête : Stripe anti-fraude, DAC7 transparence, ne rend pas pro)
- `8ca93d6` **LOT 2 — protection de l'argent** (voir plus bas)
- `d9ade89` + `5bbf0d0` create-connect-account : auto-réparation robuste (ne plante plus sur erreur non-404 ; si l'ID stocké n'est pas un compte connecté valide → reset + recrée + réessaie) + **`[diag]` temporaire du message Stripe (À RETIRER)**

## LOT 2 (protection argent) — POUSSÉ + 3 SQL EXÉCUTÉES ✅
Corrige la fuite qui faisait passer le solde Stripe en NÉGATIF (les remboursements en plein ne récupéraient pas les frais Stripe).
- `_fees.js` `computeRefundAmount` : remboursement = total − protection (garde la marge) ; port FIGÉ sur la commande (`shipping_fee`).
- `create-checkout-session` : importe `_fees` + fige `shipping_fee`.
- `auto-refund` : remboursement garde la protection ; verrou symétrique `confirmed_at` (anti versé+remboursé) ; garde annulation pending ; veille solde NON bloquante ; TEMPS 1 (gel `shipped`→`disputed`).
- `admin-actions` : `resolve_dispute_refund` garde la protection.
- `stripe-webhook` : handler `charge.dispute.created` (chargeback) + **reversal** + gel des retraits du vendeur.
- `confirm-receipt`/`Orders` : TEMPS 1 (réception via suivi transporteur, plus par l'acheteur).
- `CGV §8` : protection non remboursable + responsabilité du fautif.
- **3 migrations SQL EXÉCUTÉES** : `20260630_shipped_at.sql`, `20260701_order_shipping_fee.sql`, `20260701_order_status_chargeback.sql`.
- Revue argent adverse (workflow) passée : **6 failles corrigées** (course confirm-escrow↔auto-refund versé+remboursé ; chargeback sans reversal ; annulation pending écrasant une commande payée ; garde-fou solde bloquant à tort ; port relu dans la table).

## ÉTAT ACTUEL
✅ Onboarding vendeur (Stripe redirect, sans SIRET) · Wallet « Mon argent » · Paiement/séquestre · LOT 2 actif.
⚠️ Solde plateforme était −0,15 € (dû aux vieux remboursements en plein) → user a rechargé **2 €** (arrive sous ~2 j).
⚠️ Vente « Chemise » 0,39 € coincée en `payout_pending` (le solde négatif empêchait le transfert au wallet) → se débloquera une fois le solde positif (peut nécessiter un coup de pouce).
⚠️ Comptes connectés test EN DOUBLE (Awso) : garder `acct_1ToTLxLytIiJTilW` (tzk97431), supprimer l'orphelin `acct_1ToTPWLxZPFN2W4q` (reuniclean). Vides. PAS le compte entreprise du user.
✅ Compte Amandine (propriétaire plateforme) : `stripe_account_id` était corrompu → auto-réparé. Amandine n'a PAS besoin d'être vendeuse (l'argent de NOUT arrive via le payout auto du compte plateforme).

## 🔴 À FAIRE AVANT LANCEMENT OFFICIEL
1. **PROUVER un retrait de bout en bout** (vente → wallet vendeur → banque) — JAMAIS vu marcher encore (était bloqué par le solde négatif). À faire dès que le 2 € est arrivé : vente test neuve → « Retirer » → vérifier l'arrivée banque (1er payout Stripe retenu ~7-14 j).
2. **Nettoyages** : RETIRER le `[diag]` temporaire de `create-connect-account.js` ; **AJOUTER l'event `charge.dispute.created`** au webhook Stripe (dashboard Amandine) sinon chargebacks non captés ; rédiger la **clause CGV** « vendeur responsable de ses obligations ».
3. **Conseillé (pas bloquant)** : confirmation expert-comptable sur le fiscal (revente occasionnelle non-pro, DAC7).

## ➡️ PROCHAINE BRIQUE : API LIVREURS (UBN / Chronopost)
- Intégration UBN préparée côté serveur, en attente de la **clé API UBN** (guide : `nout/INTEGRATION-UBN.md`).
- Le TEMPS 1 (gel des commandes livraison) est un **placeholder** en attendant le suivi transporteur → « TEMPS 3 » = libération auto à la confirmation de livraison.
- Vérifier que le **port** facturé (6,51 € relais / 10,80 € domicile) couvre le **vrai coût transporteur** (sinon NOUT perd sur la livraison).

## RÈGLES
Montrer le diff + revue argent adverse AVANT tout push paiement. Rien pousser sans le OK du user. Design sobre, teal en accent, PAS d'emojis dans l'UI, mobile-first, FR. Toujours vérifier le build en local (`npm run build`) avant de pousser du code sensible.
