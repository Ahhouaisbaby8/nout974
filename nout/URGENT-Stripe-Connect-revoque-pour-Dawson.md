# 🚨 URGENT — Accès Stripe Connect révoqué (retraits vendeurs bloqués)

> Diagnostiqué le 27/07 avec Amandine. **Touche les clés/secrets Stripe → à traiter par Dawson.** L'argent n'est pas perdu (sécurisé chez Stripe), c'est l'ACCÈS qui est cassé.

## Symptôme
- Page **« Mon argent » → « Vérifier mon identité »** affiche **« Lecture du compte de paiement impossible pour le moment »** pour Amandine (Am_8) ET pour les vendeurs.
- Conséquence : **personne ne peut activer/finir ses paiements ni retirer.** Le vendeur **Evin (exavier.bnr)** n'a jamais été payé (sa commande Nike `25512e4f`, colis reçu, reste `delivered` car le versement échoue). Amandine dit : **« avant on pouvait retirer, maintenant non »** → régression.

## Cause EXACTE (message Stripe capté via diag temporaire sur connect-kyc-status)
```
The provided key 'sk_live_****eeP0ju' does not have access to account
'acct_1TfJDcLuVsnfUiDA' (or that account does not exist).
Application access may have been revoked.
[code=account_invalid  type=StripePermissionError]
```
→ La clé **`sk_live`** actuellement dans Netlify (`STRIPE_SECRET_KEY`) **n'a plus accès aux comptes connectés** des vendeurs. `stripe.accounts.retrieve(accountId)` renvoie `StripePermissionError / account_invalid`.

### Indice fort
- Le compte dans l'erreur = `acct_1TfJD...`
- Mais le `stripe_account_id` d'Amandine en base = `acct_1Tt2ot...`
- **Ce ne sont pas les mêmes** → il y a eu un **changement de plateforme / de clé Stripe** : les `acct_*` stockés en base ont été créés sous une clé/plateforme Stripe **A**, et la clé `sk_live` actuelle appartient à une plateforme **B** qui n'a pas accès à ces comptes.

## Pistes de résolution (côté Dawson — NE PAS toucher aux clés sans toi)
1. **Vérifier dans le Dashboard Stripe** quelle plateforme possède la clé `sk_live_...eeP0ju` actuelle, et si les comptes connectés `acct_1TfJD...` / `acct_1Tt2ot...` y sont bien listés (Connect > Comptes).
2. Si les clés ont été **régénérées/changées** récemment → soit remettre la bonne clé (celle qui a créé les comptes), soit **re-onboarder** les vendeurs sous la nouvelle plateforme.
3. Si c'est un **changement de compte Stripe plateforme** (A→B) : les `stripe_account_id` en base pointent vers l'ancienne plateforme → il faudra décider (revenir à A, ou recréer les comptes connectés sous B et re-remplir `stripe_account_id`).
4. Vérifier que `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET` (Netlify) appartiennent **toutes à la même** plateforme Stripe.

## Ce que j'ai fait (Claude, côté Amandine)
- Diagnostic via modif TEMPORAIRE de `connect-kyc-status` (renvoyait le message Stripe à l'écran) → **déjà remise au message générique** (commit d2c6891). Rien d'autre touché.
- Aucune clé/secret modifié. Aucun statut de commande modifié aujourd'hui.
- La fonction `connect-kyc-status` elle-même n'a PAS de bug — elle relaie fidèlement l'erreur Stripe.

## ⚠️ Impact business
Tant que ce n'est pas réglé : **aucun vendeur ne peut activer ses paiements ni être payé.** C'est bloquant pour le lancement. À prioriser.
