# Session 22-23 juillet 2026 — Scroll publication mobile + cron Chronopost (Evin) + délai 48h

## Vue d'ensemble
Session : fix scroll mobile de la publication, migration sale_mode exécutée (mode « mise en relation » véhicules poussé par Dawson), déblocage du vendeur Evin + correction racine du cron Chronopost, confirmation que les crons Netlify tournent. Collaboration à 2 PC. **Dernier commit code : 9afb47e.**

---

## 1. FIX — Scroll de la publication bloqué sur mobile (commit 5cbc437)
Audit complet des composants scrollables du flux de publication.
- **BUG MAJEUR — CategoryPicker** : forçait `document.body.style.overflow = ''` au lieu de restaurer la valeur précédente. Un mauvais ordre de démontage laissait `body.overflow = 'hidden'` → **toute la page figée** après fermeture du sélecteur → champs du bas (état, prix…) inatteignables. Fix : sauver `prevOverflow` puis le restaurer (comme MobileMenu).
- **SizeGuideModal** : conteneur `overflow-y-auto` sans `flex-1 min-h-0` → 2e tableau coupé. Fix ajouté.
- **CropModal** : `overflow-hidden` ET `overflow-y-auto` en conflit sur l'axe Y → boutons Annuler/Recadrer potentiellement hors écran. Fix : `overflow-y-auto` seul.
- **ColorPicker** : vérifié OK (chips en flow normal).

## 2. Migration sale_mode exécutée (mode « mise en relation » = Dawson)
- Dawson a poussé le mode « mise en relation » pour les véhicules (fichiers ListingDetail.jsx, categories.js, migration `20260721_listings_sale_mode.sql`).
- Amandine a exécuté la migration sur Supabase prod → **Success**. Colonne `listings.sale_mode` ('escrow'/'contact'), DEFAULT 'escrow' (tout l'existant intact), trigger qui force 'contact' pour la catégorie véhicules (non contournable). Backfill = 0 ligne (aucun véhicule en base).
- Catégories ajoutées par Dawson : **Véhicules** (vehic-voitures, motos, utilitaires, quads, nautisme, remorques, autres) + **Pièces & accessoires auto**. Les véhicules affichent « Contacter le vendeur », pas de paiement en ligne. Cohérent avec la décision du 20/07.

## 3. Vendeur Evin non payé + FIX cron Chronopost (commit 9afb47e — MONEY-SENSITIVE)
- **Symptôme** : Evin (= exavier.bnr, commande Nike id `25512e4f`, colis point relais reçu) toujours pas payé. Commande restée `shipped` alors que `chronopost_status = 'DC'` (colis livré) et `delivered_at = NULL`.
- **Déblocage immédiat** (colis reçu confirmé par Amandine) : `UPDATE public.orders SET status='delivered', delivered_at=now() WHERE id='25512e4f-...' AND status='shipped'` → vérifié delivered + date OK. Le cron release-delivered versera 48h après.
- **CAUSE RACINE** : dans `chronopost-tracking.js`, `fetchLastEvent` ne retournait que l'événement **courant** (highPriority sinon dernier). Si Chronopost ajoute un événement plus récent NON livré après la remise `DC`, la livraison n'est plus « vue » → commande jamais passée en delivered → vendeur jamais payé. **Bloquait potentiellement tous les colis relais.**
- **FIX** : `fetchLastEvent` renvoie désormais `{ code, date, deliveredEvent }` où `deliveredEvent` = 1er code de livraison trouvé **dans tout l'historique**. La boucle utilise `deliveredEvent` (avec sa date réelle). Ne verse rien ici (release-delivered verse 48h après). `node --check` OK.
- **UBN vérifié** : déjà robuste — `classifyUbnStatuses` boucle sur tout le flux de statuts, et n'accepte « livraison colis terminée » (= retrait effectif, pas le dépôt). **Aucune modif UBN nécessaire.**

## 4. Crons Netlify CONFIRMÉS actifs
Vérifié dans Netlify > Logs & metrics > Functions : `chronopost-tracking`, `release-delivered`, `auto-refund`, `ubn-tracking`, `sweep-wallets` tous badgés **« Scheduled »** avec prochaines exécutions affichées. chronopost-tracking recréé au moment du déploiement du fix.
→ **Conclusion** : le bug d'Evin venait de la LOGIQUE (code DC pas reconnu avant le 20/07, puis event enterré), pas d'un cron mort. Les 2 fixes (ajout DC le 20/07 + scan historique aujourd'hui) bouchent les deux trous. **Désormais sûr pour les colis point relais Chronopost.**

## 5. DÉCISION — Délai de protection acheteur MAINTENU à 48h
- Amandine a envisagé de passer à 24h (payer les vendeurs plus vite). Après réflexion, reco donnée : **garder 48h** (standard Vinted/Vestiaire ; protège mieux si l'acheteur reçoit le colis le soir et n'ouvre que le lendemain ; gain de 24h faible vs risque de litige mal géré au lancement).
- Les changements 24h avaient été faits (release-delivered + textes emails/notif/Help/CGV) puis **intégralement annulés** → `RECEIPT_WINDOW_HOURS` reste **48**. Tous les textes cohérents à 48h.
- ⚠️ Ne pas confondre avec le gel 48h anti-changement d'IBAN (request-payout / sweep-wallets / connect-kyc-submit) = autre mécanisme, inchangé. Ni avec le délai de traitement des signalements (« on répond dans les 24 h » = support, correct).

---

## Rappels critiques (inchangés)
- Money-sensitive : diff + revue + OK explicite avant push. `node --check` / build avant push sensible.
- Le versement vendeur reste conditionné à l'activation des paiements (identité + IBAN). Sinon → payout_pending.
- Code escrow 6 chiffres = MAIN PROPRE uniquement ; livraison = suivi transporteur + 48h. On ne SUPPRIME jamais une commande. `git pull` avant / `git push` après.
