# Session 27-28 juin 2026 — Refonte design hero + modèle tarifaire + centre de notifs

## Vue d'ensemble
Grosse session, beaucoup de commits poussés en prod (nout.re). Tout est déployé et propre.

## 1. MODÈLE TARIFAIRE — changement majeur (face à KazaKaz)
- **Grille KazaKaz vérifiée** (9 annonces réelles) : frais = 15% sur articles ≤32€, 12% au-delà de ~99€, **prélevés SUR LE VENDEUR** (prix affiché "dont X€ de frais"). Livraison identique à NOUT (UBN 4€/6€, Chrono 6,51€/10,80€).
- **NOUVEAU MODÈLE NOUT (10% + 0,25€ sur le vendeur)** :
  - L'acheteur paie le PRIX AFFICHÉ + le port (aucun frais de service ajouté visible).
  - Le vendeur touche : prix − (10%+0,25€) − frais Stripe. Garde ~90% (vs 85% KazaKaz).
  - NOUT garde 10%+0,25€ net (0,25€ couvre le fixe Stripe). ZÉRO perte garantie (audit comptable Node : 15 scénarios OK).
  - Fichiers : shipping.js (computeSellerPayout/computeNoutFee/computeBuyerTotal), create-checkout-session.js (total=prix+port, calcule seller_payout), confirm-escrow.js (verse le NET au vendeur via seller_payout, plus le prix entier — POINT CRITIQUE).
  - Migration : 20260627_seller_payout.sql (colonne sur orders) — ✅ exécutée par Amandine.
  - Affichage "tu reçois X€" à la publication (CreateListing). Récap fiche : "Paiement protégé inclus".
- **Combien de ventes pour 4000€/mois NOUT** : ~1230 ventes/mois si panier moyen 30€ (~41/jour), ~3200 si 10€. Levier = panier moyen + (plus tard) abonnement/boosts.

## 2. SAFE ZONES (main propre)
- safeZones.js : liste de lieux publics sûrs par zone (Nord/Ouest/Sud/Est) + conseils sécurité.
- Affichés dans le sélecteur de livraison quand "main propre" choisie (ListingDetail).

## 3. NAVBAR IMMERSIVE fusionnée au hero
- HeroContext.jsx + IntersectionObserver : navbar fixed transparente (texte blanc) sur le hero → verre dépoli (bg-white/70 backdrop-blur, texte sombre) au scroll.
- Pleine largeur (style Airbnb), **barre de recherche du haut retirée** (la grande du hero suffit).
- HERO_ROUTES = ['/', '/comment-ca-marche'] : ces pages ont leur hero plein écran ; les autres reçoivent un padding-top compensatoire.
- Fix flash blanc au chargement (overHero init à true sur pages à hero).
- Icônes navbar (connecté) : favoris (cœur) + notifs (cloche, badge temps réel) + messages, couleur conditionnelle light/sombre.

## 4. CENTRE DE NOTIFICATIONS (complet)
- Table 20260627_notifications.sql (RLS) — ✅ exécutée par Amandine.
- Service notifications.js (liste, non-lus, marquer lu, temps réel, créer).
- Page /notifications (PrivateRoute), icônes par type, marquée lue à l'ouverture.
- Événements branchés : follow ("Nouvel abonné"), message ("Message de X"), vente ("Vente réalisée") + achat ("Paiement confirmé") via stripe-webhook.js.

## 5. HERO ENRICHI (design)
- Cartes "Acheter par prix" : Option A épurée (fond blanc, prix sombre fin) — fini le dégradé bleu/violet.
- Fiche produit : typo premium/minimaliste (prix sombre, pas turquoise criard), blocage emojis à la saisie (stripEmoji.js).
- Palmiers agrandis (clamp vw, jusqu'à 420px), **masqués sur mobile** (hidden sm:block). 974 agrandi (jusqu'à 560px).
- Soleil testé puis RETIRÉ (Amandine ne l'aimait pas).
- **Paille-en-queue** (oiseau 974) : 2 oiseaux SVG translucides (~45%, longue queue effilée) traversent le hero en continu (un devant 21s, un au fond 29s, sens inverse). PAS de clic au final (easter egg testé puis retiré).
  - BUG résolu : classes `paille-fly${n}` en template literal étaient purgées par Tailwind → écrites en toutes lettres + composant PailleSvg.
  - BUG résolu : oiseau figé près du logo (animation-delay sans fill-mode) → délai supprimé.

## Commits clés poussés sur master → nout.re
De 0758893 à e3c9f86 (modèle tarifaire, safe zones, navbar, cartes prix, notifs, hero, paille-en-queue + fixes).

## RESTE À FAIRE
- **Modifier email + mot de passe** (dans Paramètres → Sécurité). Demandé par Amandine.
- **Corriger la FAQ "Comment ça marche"** : cite encore l'ancien modèle "5% + 1€, vendeur reçoit 100%" — FAUX depuis le nouveau modèle 10%+0,25€ sur vendeur.
- Test prod réel du modèle tarifaire (un vrai achat) — sensible car argent.
- Notif "offre acceptée" (type 'offer_accepted' prévu dans TYPE_META mais pas encore branché).
