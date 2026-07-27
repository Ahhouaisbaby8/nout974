# Session 27/07/2026 — Versement AUTOMATIQUE (cron externe), followers, correctifs

## 🎯 LE gros sujet : le versement automatique en livraison marche ENFIN

### Le problème (2 semaines de galère)
En vente **main propre**, le vendeur est payé via le **code à 6 chiffres** → OK depuis toujours.
En vente **livraison** (relais / domicile), le vendeur devait être payé **automatiquement 48h après
la livraison** du colis… mais **ça n'a JAMAIS marché**. C'est pour ça qu'Evin n'avait jamais reçu son
argent (payé à la main via le bouton admin).

### La cause racine (enfin trouvée)
Le cron Netlify `release-delivered` (censé verser 48h après livraison) **ne se déclenchait jamais** :
0 log en 7 jours, « Next execution » qui se repoussait sans arrêt. Problème d'INFRA Netlify, pas de code.
On a essayé : init paresseuse Stripe/Supabase, méthode officielle `schedule('45 * * * *', ...)` → rien
n'y a fait, le scheduler Netlify ne lançait toujours pas la fonction.

### La solution adoptée : un cron EXTERNE (fiable, gratuit)
- Nouvelle fonction **`nout/frontend/netlify/functions/cron-payouts.js`** : point d'entrée HTTP qui fait
  EXACTEMENT le travail (verser les vendeurs dont le colis est livré depuis > 48h, via `releaseSellerPayout`
  idempotent → jamais de double-paiement).
- Sécurité : protégée par une **clé secrète** dans la variable Netlify **`PAYOUT_CRON_KEY`** (JAMAIS dans
  le code / GitHub public). Appel sans la bonne clé = **403**.
- Un service **cron-job.org** (gratuit) appelle l'URL secrète **toutes les 15 min** :
  `https://nout.re/.netlify/functions/cron-payouts?key=<PAYOUT_CRON_KEY>`

### Le piège du 403 (résolu)
Après avoir ajouté la variable `PAYOUT_CRON_KEY` dans Netlify, le test renvoyait **403** même avec la bonne
clé. Cause : **une variable d'env Netlify ne prend effet qu'au PROCHAIN déploiement.** On a forcé un
redéploiement (micro-commit) → la variable est devenue active → **HTTP 200 « RAS — aucun versement en
attente »** ✅. Le mécanisme complet tourne désormais seul.

### Mécanisme complet (tourne tout seul, aucune action manuelle)
1. Colis livré → suivi Chronopost passe la commande en `delivered` (+ `delivered_at`).
2. Délai de protection acheteur : **48h** (l'acheteur peut « Signaler un problème » → versement suspendu).
3. Toutes les 15 min, cron-job.org appelle l'URL secrète.
4. 48h écoulées → **l'argent part automatiquement** vers le porte-monnaie du vendeur + email
   « Ton argent est disponible ».

## 🔧 Autres correctifs argent (cette session)
- **Bouton admin « Paiements vendeurs en attente »** (Dashboard admin) : tableau avec cases à cocher, infos
  par vendeur (article, montant, compte Stripe, ancienneté, ⚠ compte non activé), total sélectionné,
  bouton « Verser les X sélectionné(s) ». Amandine a la MAIN sur les versements (il s'agit d'argent).
  Endpoints `admin-release-payouts.js` (list / pay) + `listPendingPayouts` / `payPendingPayouts` dans adminApi.
- **Evin payé** (manuellement via ce bouton) — compte OK (`acct_1Tt2ot…`, Banque Postale). Confirmé `completed`.
- **Auto-réparation compte Stripe mort** : `connect-kyc-status.js` + `create-connect-account.js` — un compte
  invalide/révoqué (account_invalid/404) réinitialise `stripe_account_id=NULL` au lieu de bloquer avec
  « Lecture du compte de paiement impossible ». (Bug qui bloquait Am_8.)
- **`admin-health-check.js`** (veille santé, 1x/jour 8h) : alerte contact@nout.re si vendeur livré > 3j non
  payé / compte sans stripe_account_id / colis expédié > 10j. (⚠ c'est un cron Netlify → partage peut-être
  le même souci de non-déclenchement ; le cron externe reste le chemin fiable pour l'argent.)

## 👥 Followers / abonnements cliquables
- `follow.js` : `getFollowers(userId)` + `getFollowing(userId)` (pseudo + avatar).
- `Profile.jsx` : compteurs abonnés / abonnements **cliquables** → modale avec la liste. (Avant, on ne
  voyait QUE les abonnés des autres, pas les siens.)

## 💬 Confort messagerie
- `Conversation.jsx` : la zone de texte **s'agrandit toute seule** au fur et à mesure qu'on écrit (max-h-40).

## 📌 État / à retenir
- **Versement livraison = RÉGLÉ** (cron externe cron-job.org toutes les 15 min, clé `PAYOUT_CRON_KEY`).
- ⚠️ Les crons Netlify natifs (`release-delivered`, `admin-health-check`) peuvent ne pas se déclencher —
  le cron externe est le chemin fiable. À terme, envisager de basculer les autres crons argent en externe
  aussi si besoin (auto-refund, sweep-wallets, chronopost-tracking tournent, eux — à confirmer par les logs).
- URL secrète + clé `PAYOUT_CRON_KEY` = à NE PAS mettre sur GitHub (elle vit uniquement dans Netlify + cron-job.org).

## 🔎 Filtres de recherche façon Vinted (Search.jsx)
CONSTAT : les filtres existaient DÉJÀ et marchaient (côté écran ET côté données listings.js :
taille/couleur/matière/marque/prix/état/sous-catégorie tous branchés). Le vrai chantier = l'EXPÉRIENCE.
- **Puces de filtres actifs** sous la barre : chaque filtre posé = pastille teal, retrait d'un clic
  (croix) + « Tout effacer ». Prix min/max regroupé en UNE puce (« Moins de 30 € », « 10 – 50 € »).
- **Filtres rapides** toujours visibles (Taille / Prix / État / Tri) quand le panneau est fermé →
  ouvrent le panneau complet. Passent en teal quand actifs.
- Avant : une fois le panneau refermé, on ne voyait plus ce qu'on avait filtré → l'acheteur se perdait.
- Maquette validée par Amandine avant implémentation. Commit `d02959b`.

## 🌱 Nouvelle catégorie « Jardin & plantes » (categories.js + CategoryIcon.jsx)
Suite au constat : une vendeuse (Saint-Philippe) met déjà des plantes en vente (Davallia, Dracaena,
Philodendron…) sans catégorie dédiée.
- Catégorie `jardin-plantes` (navLabel « Jardin »), 9 sous-cat : plantes intérieur/extérieur, cactus &
  succulentes, fruitiers & aromatiques, graines & boutures, pots & jardinières, outils, déco, autres.
- Icône `Sprout`. Apparaît AUTO partout (nav desktop/mobile, picker publication, footer — tout est
  généré depuis CATEGORIES). Non-fashion → pas de taille, le vendeur précise juste l'état.
- Commit `989d339`.
- ⚠️ À NOTER : les plantes déjà en ligne ont été publiées dans une AUTRE catégorie → elles ne
  basculent pas toutes seules dans « Jardin ». À rééditer par la vendeuse, ou rebascule SQL possible
  plus tard (non bloquant).

## Commits clés
- `6c763c0` création `cron-payouts.js`
- `a41b598` redéploiement pour activer `PAYOUT_CRON_KEY`
- `677317d` doc suivi session
- `d02959b` filtres recherche façon Vinted (puces + filtres rapides)
- `989d339` catégorie Jardin & plantes
- (+ commits followers, textarea, admin payouts, auto-repair — voir git log)
