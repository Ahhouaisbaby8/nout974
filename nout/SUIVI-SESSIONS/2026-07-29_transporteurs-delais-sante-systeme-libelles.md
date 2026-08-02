# Session 29-30/07/2026 — Transporteurs (adresse collecte + UBN), délais visibles, santé système, libellés honnêtes

Grosse session multi-sujets. Fil rouge : **fiabiliser et rendre VISIBLE tout ce qui touche à la
logistique et à l'argent** (transporteurs, délais d'annulation, versements, statuts de commande).

---

## 1. Filtres recherche façon Vinted (rappel session précédente, déployé) + catégorie Jardin
(voir session 27/07 — puces filtres actifs + filtres rapides ; catégorie « Jardin & plantes »).

## 2. Adresse de COLLECTE vendeur obligatoire à la publication (pour UBN/Chronopost)
- **Décision produit** : le vendeur donne son adresse de collecte **à la PUBLICATION** de l'annonce
  (pas à l'inscription, pas à l'expédition) — validé par Amandine après 3 maquettes.
  L'acheteur, lui, donne son adresse **au paiement** (déjà en place, inchangé).
- **CreateListing.jsx** : nouveau bloc « Adresse de collecte » (adresse + complément + commune 974
  + téléphone), affiché dès qu'un article est livrable (masqué véhicules `isContactCategory` + dons 0€).
  Pré-rempli si déjà connu (`getMyShippingAddress` / profil `ship_*` + `phone`), validation `failField`,
  enregistré via `updateProfile` (phone + ship_address/2/city/postcode ; CP dérivé de `REUNION_CP`).
- **Verrou serveur** : `ubn-create-shipment.js` — `sellerShipper` renvoie `{ incomplete }` si adresse
  manquante → REFUS clair (400 `seller_address_missing`) au lieu du repli silencieux sur l'adresse NOUT
  (sinon UBN venait chercher le colis chez NOUT !). `fallbackShipper` supprimé.
  `chronopost-create-shipment.js` : ce garde-fou existait DÉJÀ (vérifié, inchangé).
- Comment UBN récupère les infos : `ubn-create-shipment` envoie `shipper_*` (vendeur) + `receiver_*`
  (acheteur). La liaison API existait déjà ; on a juste branché la bonne donnée + sécurisé.
- Commits `4ee34d0`.

## 3. UBN — vérif activation (⭐ toutes les variables sont DÉJÀ dans Netlify)
- Recherche docs : tout est sur le PC (guide PDF v4.5, .txt specs champs par service, contrats
  Chronopost, convention). **Aucun secret dans les docs** (UBN dit explicitement « transmis séparément »).
- **DÉCOUVERTE** : dans Netlify, les 5 variables UBN sont DÉJÀ renseignées : `UBN_API_KEY`,
  `UBN_HUB_BASE`, `UBN_PARTNER`, `UBN_CUSTOMER`, `UBN_API_CONNECT_ID` (+ `UBN_SOURCE_SITE`,
  `UBN_STATUS_SYNC_SECRET`). La clé est personnelle (pas « la même pour tous »).
- **Bouton « Tester UBN »** créé : `admin-ubn-test.js` (ping + auth-check + points-relais 97400 réel,
  sans exposer les secrets) → Admin > Paramètres > Transporteurs. Verdict vert/ambre + détail.
  ⏭️ **À FAIRE** : Amandine doit cliquer « Tester UBN » et voir si tout est vert (clé acceptée +
  serveur répond). Si OK → activer l'affichage UBN au checkout. Commit `2bf24d1`.
- Endpoints doc v4.5 : préfixe `/wp-json/ubn-api-hub-re/v1/distant` ; POST signé HMAC
  (timestamp + "." + body, clé). Codes services : relais, economique, express, express_pro, samedi_express.

## 4. Délai de 7 jours avant annulation — RENDU VISIBLE (le système existait, invisible)
Rappel système : au paiement, `escrow_codes.expires_at` = paiement + 7j. Si vendeur n'expédie/remet
pas à temps → `auto-refund` annule + rembourse l'acheteur (auto). Personne n'était prévenu avant.
- **Checkout.jsx** : encart au paiement (message adapté main propre / livraison).
- **Orders.jsx** : composant `DelaiCountdown` (compte à rebours j/h/min lu depuis `escrow_codes.expires_at`,
  message adapté acheteur/vendeur, alerte < 24h). Visible sur commandes `paid`.
- **Admin (OrdersList + admin-orders-diagnostic)** : colonne « Délai avant annulation ».
- Commit `b0671b1`.

## 5. Panneau « Santé du système » — prouver que les crons tournent
Question d'Amandine : NOUT est-il VRAIMENT à jour (interroge les transporteurs, gère délais/versements) ?
- **Table `cron_heartbeats`** (migration `nout/MIGRATION-cron-heartbeats.sql` — ✅ PASSÉE par Amandine).
- **Helper `_heartbeat.js`** : chaque cron écrit sa dernière exécution (upsert best-effort).
  Branché dans : `chronopost-tracking`, `ubn-tracking`, `auto-refund`, `cron-payouts` (+ sur sortie
  « rien à suivre » → ne paraît pas mort à tort).
- **Encart admin** : 4 pastilles (suivi Chronopost / suivi UBN / annulation-remboursement / versement
  vendeurs) + dernière exécution. Vert < 90 min · Ambre < 6h · Rouge au-delà. Commit `f219f3e`.
  ⏭️ Pastilles ROUGE « Jamais exécuté » au début = NORMAL (migration juste passée, aucun cron n'a
  encore tourné). Elles verdissent au fil de l'heure (versement ~15 min en 1er). Si l'une reste rouge
  après 1-2h → cron mort → basculer sur cron externe (comme les versements).

## 6. Page Commandes admin : BUG RLS corrigé + colonnes versement/délai + enquête
- **BUG RLS** (important) : le tableau lisait `orders` côté navigateur → la RLS masquait des commandes
  récentes (ex. 28 juil.) alors que Stripe avait bien un virement. Fix : le tableau passe par
  `admin-orders-diagnostic` (service key → voit TOUT). Encart « fraîcheur » (total/7j/30j/dernière).
  Commits `b94576c`, `9f1650d`.
- **Colonne « Versement vendeur »** : payé / en cours / sous X h/j / en attente livraison / litige /
  rien à verser (déduit du statut + delivered_at). Commit `1ca2994`.
- **Colonne « Délai avant annulation »** + date (voir §7).

## 7. Vérité sur les statuts « Expédié » (⚠️ sujet soulevé par Amandine — bien vu)
- Amandine repère : « Vend 3 pour 10€ » affichée Expédiée / « remis à temps » alors que le colis
  n'a jamais été remis au relais UBN. Et elle a reçu 4,35 € sur Revolut → craint un versement anormal.
- **Outil `admin-order-inspect.js`** créé (base + Stripe, lecture seule) : Admin > Commandes >
  « Enquêter sur une commande ». Dit la vérité sur l'argent (transferts vendeur via `transfer_group`
  `order_<id>`, remboursement) + alertes. Commit `13f60c0`.
- **VERDICT enquête « Vend 3 pour 10€ »** : PAS de bug d'argent.
  - Vendeur payé (transfert Stripe) : **NON** ✅ (Awso03 n'a rien touché).
  - Les 4,35 € sur Revolut = **payout PLATEFORME NOUT** (compte maître d'Amandine encaisse les
    acheteurs), PAS un versement vendeur. Normal (cf. [[stripe_compte_plateforme]]).
  - Pas de remboursement acheteur ENCORE = normal : `auto-refund` en rouge (migration juste passée) +
    escrow prolongé à expédition+10j. Partira quand le cron tourne.
  - Vraie cause du malentendu = **libellé trompeur**. « Expédié » = étiquette générée (le vendeur a
    cliqué « Générer l'étiquette » juste après le paiement, d'où même heure), PAS colis physiquement remis.
- **CORRECTION LIBELLÉS** (`a12b0ea`) : le seul fait FIABLE = `delivered_at` (confirmé transporteur).
  - Admin colonne délai : « livré » (vert, date delivered_at) uniquement si transporteur confirme ;
    « colis pas encore remis » (ambre, « étiquette le… ») si `shipped` sans `delivered_at`.
  - Orders (vendeur/acheteur) : statut `shipped` = « Étiquette prête » (au lieu de « Expédié »).
- **Anti-faux-numéro** (`ccd26f7`) : `update-order-shipping.js` — un numéro tapé à la main qui
  ressemble à du Chronopost est vérifié via `trackSkybillV2` avant d'accepter « expédié ». Introuvable
  → refus. Non vérifiable / Chronopost injoignable → on ne bloque pas (vendeur honnête).

---

## ⏭️ REPRISE PROCHAINE SESSION
1. **Tester UBN** (Admin > Paramètres > bouton « Tester UBN ») → dire si tout est vert. Si oui →
   activer affichage UBN au checkout (points relais + modes livraison) + bouton bordereau vendeur.
2. **Vérifier santé crons** (Admin > Commandes) après 1-2h : les pastilles doivent verdir. Toute
   pastille rouge persistante → basculer ce cron sur cron externe (cron-job.org, comme les versements).
3. (Optionnel) Bouton admin « Rembourser maintenant » pour commandes coincées (ex. Vend 3 pour 10€).
4. SEO (voir [[seo_rappel]]) = à faire à la fin, priorité majeure.

## SUITE 30-31/07 (soir) — remboursement colis non déposé + audit argent complet
⭐ Grosse suite. Amandine repère « Vend 3 pour 10€ » (acheteur thomas) affichée expédiée/remis à temps
alors que le colis UBN n'a JAMAIS été déposé, + elle a reçu 4,35€ Revolut → crainte versement anormal.

- **Enquête (admin-order-inspect)** : PAS de bug argent. Vendeur PAS payé. 4,35€ = payout PLATEFORME
  [[stripe_compte_plateforme]]. Juste libellé trompeur → corrigé (« Étiquette prête », « colis pas encore remis »).
- **BUG RACINE TROUVÉ** : auto-refund ne remboursait QUE les commandes 'paid' → une commande 'shipped'
  (étiquette générée) dont le colis n'est jamais déposé restait coincée à vie, acheteur jamais remboursé.
  FIX (`8e41cdc`) : commande 'shipped' + delivered_at null + shipped_at > **10j** → remboursement AUTO
  (Stripe idempotent, verrou escrow, relist, email). REMPLACE l'ancien gel-litige-12j.
- **Le fameux « 4 ms »** : le bouton « Run now » de Netlify était bloqué par le garde x-nout-cron (401 en 4ms).
  Fix `6ba2891` : accepter les invocations Netlify (header X-NF-Event: schedule / UA Netlify Clockwork),
  externes toujours refusés sauf x-nout-cron. + init paresseuse Stripe/Supabase `f4a0a15`.
- **thomas REMBOURSÉ** 5,50€ (via bouton admin `admin-refund-order` `14ef27f`), confirmé Stripe « Remboursement partiel ».
- **Surlignage commandes à problème** (rouge/ambre + badge « colis non remis depuis X j ») + temps écoulé
  dans l'enquête + commandes remboursées bien visibles en vert (`69fa47f`).
- **cron-logistics.js** (`88133ed`) : endpoint chef d'orchestre (chronopost+ubn+auto-refund en 1 appel,
  clé PAYOUT_CRON_KEY). ⚠️ FAIT DOUBLON avec la proposition de Dawson (5 jobs séparés x-nout-cron) → À TRANCHER.

### ⭐ NETLIFY MARCHE (je me trompais) — vérifié via les captures d'Amandine
Les crons natifs SONT « Scheduled » avec next execution programmée (auto-refund 22h, chronopost 22h15…).
`auto-refund` TOURNE (Run now a remboursé thomas). Ce n'est PAS l'abonnement. Reste à confirmer via LOGS
si chronopost-tracking/ubn-tracking tournent (pastilles rouges = pas encore d'exéc. avec le code heartbeat).

### AUDIT ARGENT COMPLET (tout vérifié dans le code) — RASSURANT
- ✅ Versement vendeur (48h, cron externe), remboursement 7j/10j, LITIGE (bouton « Signaler » → disputed
  + email + versement suspendu, confirm-receipt.js), **CHARGEBACK géré** (stripe-webhook.js `charge.dispute.created`
  → reprend l'argent au vendeur + gèle retraits + email → NOUT jamais à découvert).
- 🟠 SEUL VRAI RISQUE : suivi transporteur (chronopost-tracking/ubn-tracking) peut-être mort → si oui,
  aucun colis ne passe 'delivered' → personne payé/aucun litige démarré. À CONFIRMER (logs Netlify + Dawson).

### ⏭️ REPRISE (décidé, PAS fait — stop pour ce soir)
1. **CGV** : article 4 dit « 7 jours » → AJOUTER le cas 10j (colis expédié jamais déposé). Voir [[cgv-delai-10j]].
2. **Crons** : vérifier logs chronopost-tracking/ubn-tracking. Si morts → cron-job.org. TRANCHER avec Dawson :
   cron-logistics (1 job) OU ses 5 jobs séparés. NE PAS doublonner auto-refund.
3. **Système délais complet** (validé par maquette, à coder) : alerte email 24h AVANT remboursement auto
   (Amandine peut bloquer si arnaque) + litige 72h + email immédiat. « L'info sous les yeux de chacun »
   (acheteur/vendeur voient leur délai sur chaque commande).
4. Message point 6 pour Dawson préparé (liste commits + points à trancher) — à lui envoyer.

Commits soir : `13f60c0` enquête · `ccd26f7` date+anti-faux-numéro · `a12b0ea` libellés · `88133ed` cron-logistics
· `8e41cdc` remboursement 10j + surlignage · `f4a0a15` init paresseuse · `6ba2891` Run now · `14ef27f` bouton
rembourser · `69fa47f` remboursées visibles.

## SUITE 02/08 — crons confirmés OK + boutons test transporteurs + UBN 5 services complets
- ⭐ **CRONS CONFIRMÉS VIVANTS** : le panneau Santé affiche les 4 crons TOUS VERTS (Suivi Chronopost,
  Suivi UBN, Annulation & remboursement, Versement) avec exécutions récentes. Netlify DÉCLENCHE bien
  les crons natifs — je m'étais trompé (le « 4 ms » du Run now = garde x-nout-cron qui bloquait le Run
  now du dashboard, PAS un cron mort). Fix `_cron-auth.js` (`884c586`) : accepte les invocations Netlify
  (X-NF-Event: schedule / UA Clockwork) + appel signé, refuse les externes. Applique aux 4 crons.
  ⚠️ CONCLUSION : PAS besoin de cron-job.org pour les crons de suivi — Netlify suffit. cron-logistics
  reste dispo en secours mais NON branché (ne pas doublonner). thomas remboursé + Evin payé = preuves.
- **Bouton « Actualiser »** bien visible sur page Commandes (`97e380e`, recharge tout).
- **Bouton « Tester Chronopost »** ajouté à côté de « Tester UBN » (`b5f015d`, admin-chronopost-test.js,
  composant CarrierTest réutilisé). Admin > Paramètres > Transporteurs.
- **UBN — champs formulaire Point Relais + domicile** remplis explicitement (demande UBN) : `755b846`
  (Point Relais) + `f9db71b` (adapte relais/domicile). Les fichiers UBN ne contiennent AUCUN prix
  (« frais_expedition » vide → tarif calculé par le HUB).
- **UBN — 5 SERVICES tous branchés** (`fa545d8`) : tarifs TTC confirmés par l'interface UBN (captures) :
  Point Relais 4€ (relais) · 48/72H 6€ (economique, = le fichier « 4872 ») · Express 10€ (express) ·
  Express Premium 14€ (express_pro) · Samedi Express 18€ (samedi_express). 3 nouveaux ajoutés à
  shipping.js (checkout) + _fees.js (tarif serveur) + ubn-create-shipment.js (mapping + DELIVERY_PARAMS
  type_lieu/délai/créneau par service tirés des fichiers UBN).
- **CHRONOPOST = déjà complet** : 2 contrats seulement (Relais DOM 8,52€ + Express 10,96€), les 2
  déjà branchés. RIEN à ajouter (contrairement à UBN qui avait 5 services). Pour en ajouter il faudrait
  souscrire de nouveaux contrats Chronopost — pas nécessaire.

⏭️ REPRISE : UBN production only → le vrai bordereau ne sortira qu'à une VRAIE commande UBN (le code
envoie maintenant tous les champs des 5 services). CGV 10j toujours à ajouter [[cgv-delai-10j]].
Système alerte 24h + litige 72h toujours à coder.

## Commits de la session
`4ee34d0` adresse collecte · `2bf24d1` bouton test UBN · `b0671b1` délai visible ·
`f219f3e` santé système · `b94576c`+`9f1650d` fix RLS commandes · `1ca2994` colonne versement ·
`ccd26f7` date remise + anti-faux-numéro · `13f60c0` enquête commande · `a12b0ea` libellés honnêtes.
