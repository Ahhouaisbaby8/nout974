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

## Commits de la session
`4ee34d0` adresse collecte · `2bf24d1` bouton test UBN · `b0671b1` délai visible ·
`f219f3e` santé système · `b94576c`+`9f1650d` fix RLS commandes · `1ca2994` colonne versement ·
`ccd26f7` date remise + anti-faux-numéro · `13f60c0` enquête commande · `a12b0ea` libellés honnêtes.
