# Session 23-24 juin 2026 — Livraison Chronopost + Espace Vendeur + refonte UX

> Dossier de suivi : `nout/SUIVI-SESSIONS/`. Un fichier par session pour ne jamais perdre le fil.

## Résumé en une phrase
Mise en place du tunnel de livraison Chronopost (zéro perte trésorerie), de l'Espace Vendeur, de la refonte UX de publication, et lancement de la refonte visuelle "sobre" (en cours).

---

## 1. Contexte de départ (rappel)
- NOUT = marketplace seconde main mode, La Réunion 974. React+Vite+Tailwind, Supabase, Netlify (nout.re).
- Stripe LIVE ✅, Google OAuth ✅, escrow ✅, Membres Fondateurs ✅, SIRET ✅.
- Concurrent direct : **kazakaz.re** (312 users, 420 annonces, PWA-only, a UBN à 4€ + IA photo).

## 2. Analyses concurrentielles menées (4 agents)
- **Audit codebase NOUT** : socle solide, manque couche croissance/conversion.
- **Kazakaz** : force = IA photo (Amandine l'écarte) + livraison UBN. Faiblesse = petite base, commission cachée, pas de fondateurs.
- **Vinted/Depop/Wallapop/Vestiaire/Backmarket** : voir `nout/ANALYSE-CONCURRENTIELLE-2026-06-23.md`.
- **Étude UX/visuelle** : voir `nout/ETUDE-UX-VISUELLE-2026-06-24.md`. Modèle = Vinted (structure) + Grailed/Vestiaire (sobriété mono/whitespace) + 1 accent Wallapop.

## 3. Décisions structurantes prises
- **IA photo ÉCARTÉE** (pas une priorité Amandine).
- **Chronopost SEUL** (pas UBN) — concentrer le volume pour négocier réductions. KBIS déjà envoyé.
- **Modèle livraison : NOUT garde sa marge + ZÉRO perte trésorerie** (Amandine n'a pas de tréso → interdiction absolue de perdre sur un colis).
- **Formule finale** : main propre gratuite (protection 5%+1€) / Chronopost relais 6,49€ (protection 5%+3,49€) / domicile 8,90€. Vérifié par simulation : NOUT positif de 3€ à 100€ sur tous les modes.
- Note : on ne peut PAS être moins cher que Kazakaz en livraison (eux ont UBN à 4€ + tréso). On gagne via la **main propre gratuite** (17,26€ vs ~19-21€ Kazakaz) + négo volume Chronopost à venir.

## 4. Code livré et DÉPLOYÉ (commits 638952a puis fix 306e05c sur master → nout.re)

### Livraison
- `src/utils/shipping.js` (NOUVEAU) — source de vérité tarifs (front)
- `netlify/functions/create-checkout-session.js` — recalcul total côté serveur sécurisé, accepte shippingMethod
- `netlify/functions/stripe-webhook.js` — emails adaptés au mode (remise vs expédition)
- `src/pages/ListingDetail.jsx` — sélecteur 3 modes de livraison (ShippingSelector)
- `src/pages/Orders.jsx` — badge mode + SellerShippingPanel seulement en livraison
- `src/components/EscrowConfirm.jsx` — libellé adaptatif (réception vs remise)
- SQL Supabase exécuté : `orders.shipping_method` accepte 'hand'/'relay'/'home' ✅

### Espace Vendeur
- `src/pages/SellerSpace.jsx` (NOUVEAU) — route /espace-vendeur
- `src/services/sellerStats.js` (NOUVEAU) — agrégation solde 3 états + stats
- `src/App.jsx` — route ajoutée
- `src/components/layout/Header.jsx` — lien menu + emojis menu → icônes lucide

### UX publication
- `src/components/ui/ChoiceChips.jsx` (NOUVEAU) — boutons de choix sobres
- `src/pages/CreateListing.jsx` — Catégorie/État en chips, titre suggéré auto, phrases-types description

### Visuel
- `src/components/ui/ListingCard.jsx` — ratio 4:5, hiérarchie marque/titre/taille·état/prix, fade image
- `src/components/ui/SkeletonCard.jsx` — ratio 4:5 cohérent
- `src/components/layout/BottomNav.jsx` — bouton "Vendre" central proéminent (gradient, ring, safe-area iOS)
- `src/pages/Home.jsx` — barre recherche effet machine à écrire
- `src/services/reviews.js` — getSellerRating() + note vendeur sur fiche
- `src/components/ui/ListingCard.jsx` — popups "Détails du prix" + "Protection acheteurs"

### Fix critique
- `package.json` : `stripe@22.2.3` + `web-push@3.6.7` RÉINSTALLÉS (avaient été retirés par erreur → build Netlify cassait). ⚠️ NE JAMAIS LES RETIRER (requis par fonctions Netlify).

## 5. ⏸️ EN COURS — non commité, à reprendre

### Reproche visuel ferme d'Amandine (24 juin)
"Pas assez pro, trop de couleurs, emojis partout, lettres en gras/gros. Reste sobre."

### Fait mais PAS commité
- `src/pages/SellerSpace.jsx` REFAIT SOBRE (monochrome, blanc/gris, 1 touche turquoise, plus de dégradés/gras). Build OK.

### À FAIRE à la reprise (gros chantier emoji)
Supprimer TOUS les emojis du code (Amandine ne veut plus avoir à le signaler). ~30 fichiers.
- **Prioritaire user-facing** : EscrowConfirm, OrderToast, CreateListing (🚀✕), Conversation (👋💰⛔➤🌴), ReportModal, ErrorBoundary (😕), CropModal, CompteActive, FounderBadge (🌴), ListingDetail (💳💰💬🚩📍🕒👁📷), Footer.
- **Admin (moins urgent)** : AdminLayout, Dashboard, Finances, Reports, RGPD, SiteSettings, ListingsModeration.
- **DEV only (ignorables)** : BrandPage, BrandCompare.
- Regex de scan : `/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}]/u`

### Puis (après emojis)
1. Vérifier sobriété générale (typo, 1 accent, whitespace)
2. Fiche produit 2 colonnes (galerie sticky / infos+CTA)
3. Formulaire publication amélioré (photos réordonnables)
4. Système de LOT (demandé par Amandine, gros chantier — bundle multi-articles même vendeur, port partagé)

## 6. À vérifier
- ⚠️ Confirmer que le déploiement Netlify de 306e05c est passé VERT (le 638952a avait échoué sur stripe manquant).
