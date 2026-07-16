# 📦 RÉCAP CHRONOPOST — à lire par le Claude Code de l'autre PC

> Message d'un autre Claude Code (PC principal d'Amandine) qui a intégré Chronopost.
> Tout ce code est **déjà poussé sur GitHub** (branche `master`, commit `ffc7a4f`,
> mergé dans `41b58a9`). Fais un **`git pull`** pour le récupérer avant de bosser.

---

## CE QUI A ÉTÉ FAIT (Chronopost comme 2e transporteur, À CÔTÉ d'UBN)

Amandine a 2 contrats Chronopost **actifs** (codes confirmés par email Chronopost) :

| Contrat | Nom | `productCode` | `service` | Mode NOUT |
|---|---|---|---|---|
| 17380304 | Chrono Relais DOM | `4P` | `0` | livraison point relais |
| 17379904 | Chrono Express | `17` | `0` | livraison domicile |

### 3 fichiers créés (tous dans `nout/frontend/netlify/functions/`)

1. **`_chronopost-client.js`** — helper SOAP partagé.
   - Chronopost = API **SOAP/XML** (pas JSON), serveur `ws.chronopost.fr`.
   - Auth = `accountNumber` + `password` (6 chiffres) passés DANS chaque requête XML.
   - Parse les réponses par **regex** (pas de dépendance XML → build Netlify léger).
   - Expose : `soapCall`, `buildTags`, `credentials(mode)`, `isChronopostConfigured`,
     `useTest`, `getLastRequest`, `xmlFirst/xmlAll`.
   - `credentials('relais'|'express')` → `{account, password, productCode, service, isTest}`.

2. **`chronopost-points-relais.js`** — proxy recherche points relais (GET, lecture seule,
   rate-limité). Méthode `recherchePointChronopostInter`. Renvoie liste normalisée
   `{id, nom, adresse, cp, ville, distance, horaires}`. **Testé en réel** → 5 relais St-Denis.

3. **`chronopost-create-label.js`** — génération d'étiquette (`shippingMultiParcelV4`),
   modes 'relais' (4P) et 'express' (17). **Expéditeur = LE VENDEUR** (marketplace : c'est
   lui qui dépose le colis + reçoit les retours). Renvoie `{trackingNumber, labelBase64, raw}`.
   **Testé en réel** → 2 PDF valides, `serviceName IE2-PSD` identique à l'exemple Chronopost.

### ⚠️ Notes techniques importantes
- Le projet est en `"type":"module"` → les `.js` sont ESM. MAIS toutes les fonctions
  Netlify (UBN, Stripe, Chrono) utilisent `require`/`module.exports` en `.js`. Ça marche en
  prod car Netlify bundle via esbuild. Pour **tester en local** : copier le fichier en `.cjs`
  (sinon `node require` échoue).
- **Sécurité** : identifiants en variables d'env Netlify uniquement, jamais dans le front.
  Tant que les vars `CHRONOPOST_*` ne sont pas configurées → code inactif, aucun impact site.

---

## OÙ ÇA EN EST (état au 4 juillet 2026)

### ✅ Fait
- Les 3 fonctions codées, testées en réel avec le **compte test Chronopost** (19869502 / 255562).
- **Dossier de validation envoyé à Chronopost** (El Hassan EL MAACH, clients.dv@chronopost.fr) :
  requête + réponse XML + étiquette PDF, pour Relais DOM et Express.
  → Chronopost doit valider puis donner les 2 **mots de passe production**.

### ⏳ En attente (Chronopost)
- Quand Amandine reçoit les 2 mdp prod → mettre dans Netlify :
  ```
  CHRONOPOST_RELAIS_ACCOUNT   = 17380304
  CHRONOPOST_RELAIS_PASSWORD  = ******
  CHRONOPOST_EXPRESS_ACCOUNT  = 17379904
  CHRONOPOST_EXPRESS_PASSWORD = ******
  ```
  (le helper bascule auto du compte test au compte prod quand ces vars existent)

### ⏸️ PAS ENCORE FAIT (volontairement reporté)
- **`chronopost-tracking.js`** (suivi de colis) : NON codé. Reporté car il touche à l'argent
  et il faut le contexte complet des 2 PC avant.
- **Branchement au checkout** (Chrono + UBN au choix) : non fait.
- **Migration `orders`** : à ajouter → `chronopost_tracking_number`, `chronopost_label_url`,
  `chronopost_relay_id`, `chronopost_status`.

---

## 🔌 LE POINT CLÉ QUI TE CONCERNE (toi, l'autre PC)

En mergeant, j'ai vu que TU (l'autre PC) as codé le système paiement/wallet vendeur :
`_payout.js` (`releaseSellerPayout`), `confirm-receipt.js`, `wallet-balance.js`,
`request-payout.js`, `sweep-wallets.js`, `MyMoney.jsx`.

**`confirm-receipt.js` dit lui-même que la réception sera validée par « le SUIVI DU
TRANSPORTEUR (à brancher) ».** ← C'est exactement là que le suivi Chronopost se branchera.

Et `auto-refund.js` gèle en litige les commandes `shipped` sans suivi après
`SHIP_FREEZE_DAYS = 12` jours (filet temporaire en attendant le suivi transporteur).

**Le futur `chronopost-tracking.js` devra :**
- Interroger Chronopost (`trackSkybillV2`) sur les commandes `shipped` avec un tracking Chrono.
- Si event **code `D`** = « Livraison effectuée » → appeler `releaseSellerPayout()` (déjà codé).
- Respecter un **délai de protection acheteur** après « livré » avant de créditer
  (candidat 48h — À DÉCIDER, vérifier si un délai n'est pas déjà défini côté ton PC).
- Ignorer les commandes `disputed` (déjà géré par `_payout.js`).
- Ça remplacera le gel à 12 jours d'`auto-refund.js`.

👉 **Question pour toi** : as-tu déjà prévu un délai de protection acheteur quelque part
(entre livraison et versement) ? Si oui, dis-le pour qu'on s'aligne au lieu d'en inventer un 2e.

---

## RÈGLE 2 PC (important)
Toujours `git pull` AVANT de bosser, `git push` APRÈS. Au dernier push depuis le PC
principal, GitHub avait beaucoup d'avance (ton travail) → merge auto sans conflit, mais
autant garder l'habitude pour éviter les divergences.
