# 🤖 Briefing Claude Code (PC d'Amandine) — mise à jour au 15 juillet 2026

> **Ce fichier est écrit pour être lu par Claude Code.** Il décrit ce qui a été fait sur l'AUTRE PC (celui de Dawson), ce qui est en attente, et les règles/pièges à respecter.
> **Commence par `git pull origin master`.** Tout ce qui est marqué POUSSÉ est déjà sur master.

---

## 1. Contexte projet
NOUT — marketplace seconde main de **La Réunion (974)**. Repo `Ahhouaisbaby8/nout974`, branche **master**.
Stack : **React 19 + Vite** / **Supabase** / **Netlify Functions** / **Stripe Connect** (escrow).
⚠️ Le frontend est dans **`nout/frontend`** (chemin imbriqué), les fonctions serveur dans `nout/frontend/netlify/functions`.

**Modèle argent (à connaître avant de toucher au paiement) :**
- Separate charges & transfers avec **ESCROW**. L'acheteur paie le **TOTAL** (prix + protection **10 % + 0,25 €** + port) sur le compte Stripe **plateforme**. **Pas d'`application_fee`, pas de `transfer_data`.**
- Le **vendeur touche le PRIX PLEIN** ; NOUT garde la protection. Le transfert au vendeur est déclenché **plus tard** (à la validation).
- 🔴 **Le code escrow à 6 chiffres existe UNIQUEMENT en main propre.** En **livraison**, c'est le **suivi transporteur (livré + 48 h)** qui débloque l'argent. **Les deux flux ne se mélangent JAMAIS** (c'est le Bug B corrigé les 13-14/07 — ne pas le casser).

---

## 2. ✅ POUSSÉ depuis l'autre PC — commit `800e0de` (8 juillet)
Passe « la copie dit-elle la vérité ? » (audit texte affiché vs comportement réel du code). **Zéro euro touché, build vert.**

| Fichier | Changement |
|---|---|
| `Help.jsx` | Suppression de compte → **self-service** (avant : « écris-nous », alors que le bouton existe dans Réglages). Étiquette d'envoi **au présent** (avant : « bientôt », alors que c'est en prod) |
| `HelpBot.jsx`, `CategoryPage.jsx` | La livraison cite enfin **UBN (dès 4 €)**, pas seulement Chronopost |
| `CGV.jsx` art. 3 | Versement via **porte-monnaie « Mon argent » puis retrait** (avant : « directement sur son compte bancaire » = faux, et contredisait son propre art. 4) |
| `ReglementCatalogue.jsx`, `CharteBonneConduite.jsx` | Alignés sur les **13 rubriques réelles** (voir §3) |
| `og-tags.js` | Images OG via `/render/image/public/` → aperçus WhatsApp/FB allégés |

---

## 3. 🔴 DÉCISION HUMAINE ATTENDUE — juridique
Le **Règlement** et la **Charte** interdisaient « les articles hors mode et beauté (électronique, mobilier, alimentaire…) » alors que le catalogue **propose ces rubriques** → contradiction. Ils ont été **alignés sur le catalogue réel**, ce qui **officialise la vente d'électronique et d'ALIMENTAIRE** (*Créateurs → Gourmandises & épicerie*).
→ Ces catégories ont des obligations propres (**DLC / hygiène / étiquetage, garantie légale**). Formulation **minimale** posée, **règles détaillées par catégorie NON rédigées**. **À faire valider par un juriste.**
**Ne pas "corriger" ces pages sans décision humaine.**

---

## 4. ✅✅ RETRAIT BOUT-EN-BOUT PROUVÉ (15 juillet) — le risque paiement est CLOS
**4 vrais vendeurs ont vendu → retiré → REÇU l'argent sur leur compte bancaire, en moins d'une semaine.**
Ça valide en réel tout le circuit : escrow → transfert vers le compte connecté → payout Stripe → banque. Ça valide aussi l'onboarding « zéro page Stripe », le KYC/IBAN, le payout manuel. Le hold anti-fraude 7-14 j **n'a pas frappé**.
→ **Ne plus écrire « retrait jamais prouvé » nulle part.** Reste à confirmer que chacun a reçu le **prix plein**.

---

## 5. ⚠️ DÉCISION HUMAINE ATTENDUE — micro-trou frais Stripe sur le port
**Constat** (vrai paiement Stripe, vente test : article **1 €** + Chronopost relais **8,52 €**) :
payé 9,87 € − frais Stripe 0,40 € = net 9,47 € ; à sortir : vendeur 1 € + Chronopost 8,52 € = 9,52 € → **NOUT = −0,05 €**.

**Cause :** Stripe prend son % sur le **TOTAL, port compris**, or le port est **reversé en entier** au transporteur → NOUT mange ~1,5 % du port **sans revenu pour le couvrir**. La protection d'un article à 1 € (0,35 €) n'absorbe pas les 0,40 € de frais.

**Périmètre réel :** uniquement article **< ~2 €** **ET** expédié.
- **Main propre = JAMAIS de perte** (à 1 € → **+0,08 €**).
- Vente normale expédiée : 5 € → +0,29 € · 10 € → +0,67 € · 20 € → +1,50 €.

**Ce n'est PAS une régression** — vérifié : `git log -- nout/frontend/netlify/functions/_fees.js` = **3 commits**, aucun n'a jamais ajouté ni retiré de tampon anti-frais-Stripe. Cas jamais chiffré, c'est tout.

**2 fixes possibles — EN ATTENTE DE DÉCISION, NE RIEN CODER :**
1. **Tampon** : +~2 % du port ajouté à la protection → un article à 1 € expédié devient **+0,12 €**. Aucune restriction. Touche `_fees.js` (**money-sensitive**).
2. **Minimum 5 € pour la livraison** : sous 5 €, **main propre uniquement**. Plus simple, mais interdit d'expédier un article < 5 €.

---

## 6. 📦 UBN — facturation (compte prépayé)
- UBN = **compte PRÉPAYÉ** : on recharge le « Solde paiement » sur ubn-speed.re, **chaque colis y est prélevé**. **30 € de crédit offerts** (Total recharges = 0 €).
- ✅ Le colis part en **`SANS PAIEMENT`** (vérifié `ubn-create-shipment.js:195`) → le livreur ne réclame **rien** à l'acheteur.
- ⚠️ **Poches NON connectées** : le port arrive sur **Stripe**, le prélèvement se fait sur le **solde UBN** → **recharge manuelle**, à garder approvisionnée (sinon **étiquettes bloquées**).
- ⚠️ **Money-check au 1er vrai colis** : noter **combien UBN prélève exactement** (30 € → ?) vs les **4 €/6 €** payés par l'acheteur. Pile 4/6 € = neutre ; plus = on perd par colis.
- ❌ **Ne jamais utiliser les menus « Encaissement » / « Wallet » d'UBN** (= paiement à la livraison → l'acheteur paierait **2×**).
- ℹ️ **Changement d'email du compte UBN** : l'**ID (56)**, la **clé** et la **ligne de registre** restent → **AUCUN changement de variable Netlify**. Juste re-tester `https://nout.re/.netlify/functions/ubn-points-relais` → doit répondre `configured:true`.

---

## 7. 🟡 CODÉ MAIS NON POUSSÉ (dans un `git stash` sur le PC de Dawson)
1. **Boucle de parrainage** — lien `?ref=CODE` + suivi des filleuls, **zéro récompense monétaire** (volontaire : pré-lancement + risque faux comptes), anti-fraude (parrain posé **côté serveur uniquement**, graphe non exposé). 7 fichiers + migration `20260709_referrals.sql`.
2. **Rubrique « Maison & meubles »** dans `categories.js` (canapés, tables, armoires, lits, électroménager, déco, jardin, bricolage).

🔴 **NE PAS créer de rubrique « Maison » depuis ce PC** — « Sport & plein air » a déjà été ajouté entre-temps, une 2ᵉ Maison créerait un conflit à fusionner à la main.

---

## 8. 🔧 EN COURS sur le PC de Dawson — NE PAS DOUBLONNER
Tâche **`livemode`** : distinguer les commandes **TEST** des **RÉELLES** via le booléen `livemode` de Stripe, pour que les tests ne polluent plus les stats admin.
État : **cartographie du code en cours, rien de codé.** Demandera **UNE migration SQL** (colonne `livemode` sur `orders`) → elle sera fournie à exécuter.
🔴 **Ne pas commencer cette tâche depuis ce PC.**

---

## 9. RÈGLES & PIÈGES (à respecter absolument)
- **`git pull` avant / `git push` après.** Vérifier le VRAI code avant d'affirmer quoi que ce soit.
- 💰 **Tout ce qui touche à l'ARGENT** : montrer le **diff** + **revue argent adverse** + **OK explicite** AVANT push. `npm run build` (ou `node --check`) avant tout push sensible.
- **Clés/secrets** : JAMAIS dans le code ni le chat → uniquement variables Netlify.
- ⚠️ **La CSP est dans `netlify.toml` À LA RACINE** (`C:\...\nout\netlify.toml`), **PAS** dans `frontend/`. Toute ressource externe (carte, CDN, API) doit y être ajoutée.
- ⚠️ **Images Supabase** : utiliser **`/render/image/public/`** (les params `?width=` sont **ignorés** sur `/object/public/` → image pleine taille servie).
- ⚠️ Un commentaire JSX `{/* */}` placé **DANS une ternaire** casse le build **rolldown**.
- ⚠️ **Les 4 crons** (`auto-refund`, `chronopost-tracking`, `release-delivered`, `sweep-wallets`) sont **natifs dans le `netlify.toml` RACINE** — ils tournent seuls, pas de service externe.
- ⚠️ **Migrations** : les récentes vont dans **`nout/frontend/supabase/migrations/`** (il y a DEUX dossiers, ne pas se tromper). Style **idempotent** (`ADD COLUMN IF NOT EXISTS`), commentaire en tête.
- ⚠️ **On ne SUPPRIME jamais une commande** → on la passe à **`cancelled`** (préserve l'historique). Toujours vérifier dans Stripe avant de toucher à de l'argent.
- 🔴 **Le client ne modifie JAMAIS une commande** : `REVOKE UPDATE ON orders FROM anon, authenticated`. Tout passe par les Netlify Functions en `service_role`.
- **Design** : sobre, teal en accent discret, **PAS d'emojis dans l'UI**, mobile-first, FR.

---

## 10. 📌 Ce qu'on attend côté humain (Amandine)
1. 🔴 Faire **valider Règlement + Charte par un juriste** (électronique + alimentaire officialisés).
2. ⚠️ **Trancher le micro-trou frais Stripe** : tampon (+2 % du port) **ou** minimum 5 € pour la livraison ?
3. ⚠️ **Noter le montant prélevé par UBN** au 1er vrai colis (30 € → ?).
4. ℹ️ Ne pas créer de rubrique « Maison » (elle est en stash sur l'autre PC).
