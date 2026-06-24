---
name: project-nout
description: "Projet NOUT — marketplace seconde main La Réunion 974, 55 étapes ✅ + audits sécu #1 et #2 + ban enforcement + SIRET ✅ + session 23 juin 2026 : filtre Marque (branche test/filtre-marque) + blocs escrow accueil + aperçu financier (branche test/escrow-home), webhook Stripe corrigé (secret live + checkout.session.completed)"
metadata: 
  node_type: memory
  type: project
  originSessionId: b117eef9-40be-4c7b-9ee7-8eb582e3e515
---

# NOUT 974 — Marketplace Seconde Main

## Qu'est-ce que c'est
Marketplace de vente d'articles de seconde main ciblant exclusivement La Réunion (974). Nom : **NOUT**. Contact : contact@nout.re, Saint-Denis 974.

**Why:** Projet personnel d'Amandine, en cours de construction depuis zéro sur son PC Windows 11.

**How to apply:** Le site est en ligne sur https://nout.re (domaine principal actif). Les étapes 1–37 sont terminées + audit sécurité appliqué. Reste SIRET + Stripe live.

---

## Emplacement du projet

| Où | Chemin |
|---|---|
| PC local | `C:\Users\Amandine\nout\frontend\` |
| GitHub | https://github.com/Ahhouaisbaby8/nout974 |
| Netlify | https://nout.re (domaine principal) — fallback : https://effortless-tapioca-c6ab25.netlify.app |
| Supabase | https://pvimybfqfhrvpnmkcepy.supabase.co |

**Structure du repo GitHub :**
```
/ (racine = C:\Users\Amandine)
├── .gitignore                ← Protège NTUSER.DAT, AppData/, Downloads/, .env, etc.
├── netlify.toml              ← Config déploiement Netlify (FONCTIONNEL)
└── nout/
    ├── frontend/             ← Tout le code React
    │   ├── netlify/functions/  ← Fonctions Stripe + escrow + avis + suppression + admin
    │   ├── netlify/edge-functions/ ← OG tags
    │   ├── public/           ← PWA, push-handler.js, nout-icon-192.png, robots.txt
    │   ├── src/              ← Pages, composants, services, hooks, utils
    │   └── package.json
    └── supabase/schema.sql
```

**Commande pour relancer en local :**
```powershell
cd C:\Users\Amandine\nout\frontend
npm run dev    # → http://localhost:5173
```

---

## Stack technique (VALIDÉE)
| Couche | Outil |
|---|---|
| Frontend | React 18 + Vite |
| Style | Tailwind CSS v3 |
| Backend | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| Hébergement | **Netlify** ✅ EN LIGNE sur nout.re |
| Paiements | Stripe Connect (mode test — à finaliser avec SIRET) |

---

## Supabase (CONFIGURÉ ✅)
- **URL** : https://pvimybfqfhrvpnmkcepy.supabase.co
- **Clés** : dans `frontend/.env.local` (jamais commité — vérifié ✅)
- **Schema** : exécuté — toutes les tables + RLS + triggers + storage
- **Auth** : URL Configuration mise à jour → nout.re ✅

### Tables existantes (avec colonnes notables)
| Table | Colonnes clés |
|---|---|
| `profiles` | `warnings`, `is_suspended`, `suspended_until`, `is_banned`, `banned_at` (ajoutées 13 juin 2026), `stripe_account_id`, `iban`, `role` |
| `listings` | `size`, `material`, `brand`, `color`, `is_sold`, `is_active` |
| `orders` | statuts : `pending`, `paid`, `completed`, `payout_pending`, `refunded`, `cancelled`, `disputed` |
| `messages` | `sender_id`, `receiver_id`, `is_read` |
| `reports` | `listing_id`, `user_id`, `message_id`, `admin_note`, `reason`, `details` |
| `push_subscriptions` | abonnements VAPID par user |
| `escrow_codes` | `order_id`, `code`, `expires_at`, `confirmed_at`, `refunded_at`, `attempt_count`, `last_attempt_at`, `locked_until` |
| `favorites` | `user_id`, `listing_id` |
| `reviews` | `reviewer_id`, `seller_id`, `order_id`, `rating` (1–5), `comment`, `created_at` |

### ⚠️ Google OAuth à compléter pour nout.re
Dans **Google Cloud Console**, mettre à jour :
- Origines JS autorisées : `https://nout.re`
- URI de redirection : `https://pvimybfqfhrvpnmkcepy.supabase.co/auth/v1/callback`
- Dans **Supabase → Authentication → URL Configuration** : `https://nout.re` ✅ (déjà fait)

---

## Variables Netlify configurées ✅
| Variable | État |
|---|---|
| `STRIPE_SECRET_KEY` | ✅ (mode test) |
| `STRIPE_WEBHOOK_SECRET` | ✅ |
| `SUPABASE_URL` | ✅ |
| `SUPABASE_SERVICE_KEY` | ✅ |
| `RESEND_API_KEY` | ✅ |
| `VAPID_PUBLIC_KEY` | ✅ |
| `VAPID_PRIVATE_KEY` | ✅ |
| `VITE_VAPID_PUBLIC_KEY` | ✅ |
| `CRON_SECRET` | ✅ (aussi utilisé comme secret interne pour send-push.js) |
| `VITE_SUPABASE_URL` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | ✅ |
| `VITE_APP_URL` | ✅ `https://nout.re` (ajouté 13 juin 2026) |

---

## Plan de construction — ÉTAT AU 14 JUIN 2026 (mis à jour)

| # | Contenu | Statut |
|---|---|---|
| 1 | Setup projet + outils | ✅ |
| 2 | Page d'accueil complète | ✅ |
| 3 | Auth email + Google OAuth | ✅ |
| 4 | Formulaire publication annonce | ✅ |
| 5 | Page détail annonce | ✅ |
| 6 | Profil + Paramètres utilisateur | ✅ |
| 7 | Messagerie temps réel + message de bienvenue | ✅ |
| 8 | Recherche + filtres URL | ✅ |
| 9 | Stripe Connect (fonctions Netlify, mode test) | ✅ |
| 10 | Panel Admin complet | ✅ |
| 11 | Pages légales (CGU, CGV, Mentions, RGPD, Cookies) | ✅ |
| 12 | Déploiement Netlify automatique | ✅ |
| 13 | Interface V2 Depop × StockX | ✅ |
| 14 | Paiement Stripe testé et fonctionnel | ✅ |
| 15 | Webhook Stripe configuré et fonctionnel | ✅ |
| 16 | Emails Resend (achat + vente) | ✅ |
| 17 | Notifications push VAPID | ✅ |
| 18 | Toasts OrderToast (Realtime Supabase) | ✅ |
| 19 | Annonce marquée Vendu après paiement | ✅ |
| 20 | Champs taille + composition/matière | ✅ |
| 21 | CropModal recadrage photos 1:1 | ✅ |
| 22 | Bouton Acheter visible sans connexion | ✅ |
| 23 | Redirect automatique post-login | ✅ |
| 24 | Audit sécurité (CORS, JWT, DOMPurify, rate limit) | ✅ |
| 25 | Système signalement + panel admin | ✅ |
| 26 | Filtre mots interdits (forbiddenWords.js) | ✅ |
| 27 | Commission 5% + 1€ frais fixe | ✅ |
| 28 | Système escrow complet | ✅ |
| 29 | CRON_SECRET Netlify | ✅ |
| 30 | Audit responsive complet | ✅ |
| 31 | Notifications push+toast complètes (escrow, remboursement, multi-appareils, PNG) | ✅ |
| 32 | Page "Comment ça marche" (/comment-ca-marche) | ✅ |
| 33 | Suppression compte (modal + delete-account.js) | ✅ |
| 34 | Système notation/avis après vente | ✅ |
| 35 | Bouton partage annonce (Web Share API mobile + WhatsApp + copier lien) | ✅ |
| 36 | Système favoris/wishlist complet (table SQL + cœur ListingCard/Detail + page + nav) | ✅ |
| 37 | Simplification catégories lancement : 14 → 7 (mode + beauté uniquement) | ✅ |
| 38 | Migration domaine nout.re + audit sécurité complet | ✅ |
| 39 | Mode maintenance (VITE_MAINTENANCE=true sur Netlify) | ✅ |
| 40 | Boutons partage WhatsApp + Copier lien sur ListingDetail | ✅ |
| 41 | Champ IBAN toujours visible dans Paramètres + badge Paiements activés | ✅ |
| 42 | Emails tous depuis NOUT <contact@nout.re> — domaine nout.re vérifié Resend | ✅ |
| 43 | Email de bienvenue (send-welcome.js) avec guide install PWA iPhone/Android | ✅ |
| 44 | BottomNav mobile 5 items grid-cols-5 — Publier exactement au centre | ✅ |
| 45 | manifest.json PWA + apple-mobile-web-app-title "NOUT" | ✅ |
| 46 | Champs vêtements (taille, marque, matière, couleur) sur CreateListing + EditListing + ListingDetail | ✅ |
| 47 | Rate limiter escrow persistant Supabase (3 tentatives → verrou 1h, logs anomalies) | ✅ |
| 48 | Code de remise visible pour l'acheteur dans "Mes achats" (Orders.jsx) + RLS escrow_codes | ✅ |
| 49 | C-06 Sécurité admin — admin-actions.js (JWT+rôle) + adminApi.js + 4 pages mises à jour — SERVICE_KEY jamais côté client | ✅ |
| 50 | Ban/Unban utilisateurs panel admin — colonne Actions dans UsersList, badge "banni", protection compte admin | ✅ |
| 51 | Champs vêtements étendus à accessoires + sacs (FASHION_CATS) + traduireErreur() en français | ✅ |
| 52 | Contrainte SQL listings_condition_check : IS NULL OR (5 valeurs underscores) — catégorie beaute exemptée | ✅ |
| 53 | Audit complet : page 404 (NotFound.jsx), État masqué pour beaute, reset condition auto | ✅ |
| 54 | Page /installer-app — PWA install (beforeinstallprompt + instructions manuelles iOS/Android) | ✅ |
| 55 | Pages légales /legal/charte-bonne-conduite + /legal/reglement-catalogue + liens Footer + CGU section 10 | ✅ |

---

## Session 23 juin 2026 — Changements appliqués

### Branche `test/filtre-marque`
- **`utils/categories.js`** : export `BRANDS` ajouté (15 marques : L'Effet Péi, Superpolygone, Vally, Nike, Zara, H&M, Adidas, Shein, Jennyfer, Kiabi, Pull&Bear, Bershka, Puma, Levi's, Lacoste)
- **`services/listings.js`** : paramètre `brand` ajouté à `getListings()` → filtre `.eq('brand', brand)`
- **`pages/Search.jsx`** : filtre Marque dropdown (état `brand`, URL param `marque`, reset, `hasFilters`)
- **`pages/CreateListing.jsx`** : champ Marque → dropdown + option "Autre" (champ libre conditionnel), états `brandSelect` + `brandCustom`, `finalBrand` calculé avant submit
- **`pages/EditListing.jsx`** : même changements + initialisation depuis `listing.brand` existant (détecte si marque connue ou "Autre")
- **`supabase/migrations/20260622_add_brand_to_listings.sql`** : `ALTER TABLE listings ADD COLUMN IF NOT EXISTS brand TEXT` + index

### Branche `test/escrow-home`
- **`pages/Home.jsx`** : section B entre hero et catégories — visible si transactions actives
  - **Bloc vendeur** : encadré bleu foncé (gradient `#0A0F2C → #1A3A8F`), EscrowConfirm intégré directement, `.map(paidSales)` = 1 carte par vente en attente de code
  - **Bloc acheteur** : encadré turquoise (gradient `#0E7FAB → #00C4B4`), code escrow 6 chiffres 40px en vert `#007A6E`, alerte orange
  - **Aperçu financier** : 2 colonnes — "Gains reçus" (`completed`, turquoise) + "En attente" (`paid`/`payout_pending`, amber) — calculés sur `order.listing.price`
  - **Mode preview** : `?preview=escrow` (DEV uniquement) — mock data sans Supabase ni vrai achat — code fictif `482951` affiché

### Webhook Stripe corrigé (2 bugs distincts)
1. `STRIPE_WEBHOOK_SECRET` = clé test en Netlify au lieu de la clé live → signature rejected sur tous les events
2. Événement `checkout.session.completed` absent du endpoint Stripe live dashboard → event jamais livré
Les deux corrigés → webhook fonctionnel, acheteur reçoit le code escrow par email

### Commits de cette session
- (branches en cours, pas encore mergées sur master)

---

## Session 17 juin 2026 — Changements appliqués

### Suppression de tous les emojis côté utilisateur
- **`CategoryIcon.jsx`** (nouveau) : composant central lucide-react pour les 7 catégories (Shirt, Baby, Footprints, Gem, ShoppingBag, Sparkles)
- **`categories.js`** : champ `icon` emoji retiré de toutes les catégories
- **`HowItWorks.jsx`** : emojis étapes acheteur/vendeur, garanties, boutons CTA → icônes lucide (Search, CreditCard, Users, Key, CheckCircle, Camera, MessageCircle, Wallet, Landmark, Clock, Lock, Shield)
- **`Help.jsx`** : 💡 header, 🛍️/📸/💬 guides, 📧 contact → icônes SVG (Lightbulb, ShoppingBag, Camera, MessageCircle, Mail)
- **`About.jsx`** : 🌺 header, 🤝/🌿/🏝️ valeurs, 📧/📍 contact → icônes SVG (Leaf, Handshake, MapPin, Mail)
- Emojis `{cat.icon}` retirés de : `Home.jsx`, `ListingDetail.jsx`, `Search.jsx`, `CreateListing.jsx`, `EditListing.jsx`, `ListingReview.jsx`

### ListingCard — redesign style Vinted
- Prix réduit (15px bold, était 20px bleu), marque/taille/état affichés
- Frais acheteur ligne dédiée avec Shield icon : `Math.round((price * 1.05 + 1) * 100) / 100`
- 📷 emoji → `<Camera size={36} strokeWidth={1} />`

### Commission corrigée (10% → 5% + 1€)
- **`CGV.jsx`** : "10 %" → "5 % + 1 €, à la charge de l'acheteur. Aucun frais n'est prélevé sur le vendeur."
- **`ReglementCatalogue.jsx`** : commission corrigée + articles interdits réduits de 12 à 7 (médicaments conservé)

### Mentions Stripe neutralisées (texte utilisateur uniquement)
- **`Footer.jsx`** : "Paiements sécurisés par Stripe" → "Paiements certifiés PCI-DSS"
- **`CGV.jsx`**, **`Cookies.jsx`**, **`Privacy.jsx`** : mentions Stripe → "prestataire certifié PCI-DSS"
- **`HowItWorks.jsx`**, **`Help.jsx`** : FAQ/textes → "prestataire certifié PCI-DSS"
- Code technique (imports, API Stripe, variables env) : non modifié

### About.jsx — texte "Notre mission" mis à jour
- Nouveau texte : "...pas de frais d'importation, pas de délais d'attente interminables — juste des voisins qui échangent des objets qui ont encore de la valeur, tous basés sur l'île."
- Supprimé : paragraphe "pas de vendeurs étrangers" + paragraphe étymologie créole du mot "nout"

### Frais checkout — gross-up Stripe ✅
- Problème : acheteur payait 22€ pour un article à 20€, mais Stripe prélevait ~0,58€ → NOUT ne touchait que 1,42€ au lieu de 2€
- Correction : formule gross-up `totalAcheteur = Math.round(((prix×1.05 + 1.25) / 0.985) × 100) / 100`
  - Couvre Stripe (1,5% + 0,25€) → NOUT touche exactement 5%+1€ net
  - Appliqué dans : `create-checkout-session.js`, `ListingDetail.jsx`, `ListingCard.jsx`
- Decision : pas de 1,30€ fixe supplémentaire (trop pénalisant sur petits articles < 15€)
- Exemple 20€ → acheteur paie 22,59€ → NOUT net 2,00€ exactement

### Commits de la session
- `10dbd27` — feat: icônes lucide-react, prix Vinted, commission 5%+1€, mentions Stripe neutralisées
- `ed92da5` — feat: suppression des emojis restants — HowItWorks, Help, À propos
- `4dda7cf` — content: mise à jour section "Notre mission" — nouveau texte, sans étymologie
- `3ae61e4` — fix: frais checkout — fusion en 1 ligne "5%+1€" + arrondi centimes
- `00d0dc2` — fix: gross-up Stripe — NOUT touche exactement 5%+1€ net après frais Stripe

---

## Session 16 juin 2026 — Changements appliqués

### SIRET reçu 🎉
Auto-entreprise créée. ✅ Renseigné dans `MentionsLegales.jsx` et `SiteSettings.jsx`.

### Bannissement — enforcement complet ✅
- `AuthContext.jsx` : `getSession` async + `await fetchProfile` avant `setLoading(false)` — évite le flash de page protégée
- `AuthContext.jsx` : si `is_banned=true` → `sessionStorage.setItem('nout_ban','1')` → `signOut()` → `window.location.replace('/connexion')` (hard redirect, bypass React)
- `App.jsx` : `PrivateRoute` double garde `!user` + `profile?.is_banned`
- `Login.jsx` : bandeau orange au montage — lit `nout_ban` sessionStorage, affiche message de suspension, supprime la clé

### Sécurité — Audit #1 (score 6/10 → 8.5/10)
- `send-welcome.js` : rate limiter IP 3 req/min
- `profiles.js` + `Profile.jsx` : `getPublicProfile()` (IBAN, téléphone, stripe_account_id exclus des profils publics)
- `delete-account.js` : blocage si commandes actives (statut paid)
- `admin-actions.js` : `banned_at: now()` au ban, `null` au unban
- `UsersList.jsx` : email personnel hardcodé supprimé
- `send-warning.js` : domaine corrigé nout974.re → nout.re
- `Register.jsx` : mot de passe minimum 8 caractères (OWASP)
- `orders.js` : code mort supprimé (`createOrder`, `updateOrderStatus`)

### Sécurité — Audit #2 (P1 → P2 → P3, commit fc452c5)
- **P1** `netlify.toml` : 6 headers HTTP (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- **P1** `confirm-escrow.js:115` : vérification statut `['paid', 'shipped']` avant tout transfert Stripe
- **P2** `Settings.jsx` : IBAN masqué par défaut (`**** **** **** 143`), bouton "Modifier" pour édition
- **P2** `create-checkout-session.js:126` : `Math.random()` → `crypto.randomInt(100000, 1000000)`
- **P2** npm audit fix : 0 vulnérabilités (form-data HIGH + dompurify LOW)
- **P3** `stripe-webhook.js:37` : email retiré du console.log
- **P3** `package.json` : `stripe`, `web-push`, `axios` supprimés des dépendances frontend

### Supabase RLS — toutes les tables sécurisées
SQL généré et à appliquer dans Supabase SQL Editor :
- `orders` : SELECT → buyer_id = auth.uid() OR seller_id = auth.uid()
- `messages` : SELECT/INSERT expéditeur ou destinataire, UPDATE destinataire (is_read)
- `escrow_codes` : 0 policy = 0 accès client (SERVICE_KEY uniquement)
- `listings` : SELECT public, INSERT/UPDATE/DELETE propriétaire
- `reports` : INSERT authentifié, SELECT/UPDATE admin uniquement
- `push_subscriptions` : SELECT/INSERT/DELETE propriétaire
- `reviews` : SELECT public, INSERT reviewer uniquement (immuable)

### Logistique UBN Speed
- Essai 24h Partner activé (gratuit, 30€ de crédit)
- API UBN non disponible ("sera ajouté ultérieurement")
- Email partenariat envoyé à hello@ubn-speed.re
- Mentions UBN **supprimées du site** (pas de partenariat officiel encore)
- `update-order-shipping.js` créé : JWT + vérification seller_id + idempotence
- `Orders.jsx` : `SellerShippingPanel` (paid → saisir numéro de suivi) + `BuyerTrackingPanel` (shipped → lien UBN)
- SQL exécuté : `ALTER TABLE orders ADD COLUMN tracking_number TEXT, ADD COLUMN shipped_at TIMESTAMPTZ`

### Dernier commit
`c15cac5` — fix: bannissement — await fetchProfile avant setLoading + hard redirect (16 juin 2026)
Précédents : `d22549e` (ban enforcement AuthContext+PrivateRoute+Login), `d10d487` (SIRET MentionsLegales), `f0f4314` (suppression @stripe), `942b718` (suppression UBN), `fc452c5` (audit #2), `a9bfaad` (UBN shipping)

---

## Session 15 juin 2026 — Changements appliqués

### Slogan homepage corrigé
- `Home.jsx` ligne 144 : "Le marketplace 100 % réunionnais, entre particuliers et professionnels" → "La marketplace mode 100 % réunionnaise, entre particuliers"

### Réseaux sociaux créés
- Instagram : **@nout_reunion** (0 abonnés au lancement)
- TikTok : **@NOUTre** (0 abonnés au lancement)
- Stratégie : Instagram + TikTok uniquement (Snapchat non retenu)
- Bio + lien à compléter une fois SIRET obtenu

### Fichiers visuels créés (dans `C:\Users\Amandine\nout\`)
| Fichier | Usage |
|---|---|
| `logo-nout-n5.png` | Logo N°5 référence |
| `logo-nout-profil-400x400.png` | Photo de profil Instagram/TikTok |
| `logo-nout-post-1080x1080.png` | Post carré |
| `logo-nout-transparent.png` | Logo fond transparent (texte blanc) |
| `nout-animations.html` | Fichier unique — 6 animations avec sélecteur |
| `videos-nout/story-A-logo.webm` | Story 9:16 — logo reveal |
| `videos-nout/story-B-site.webm` | Story 9:16 — teaser site simulé |
| `videos-nout/story-C-texte.webm` | Story 9:16 — Achète. Vends. |
| `videos-nout/post-A-logo.webm` | Post 1:1 — logo reveal |
| `videos-nout/post-B-site.webm` | Post 1:1 — teaser site simulé |
| `videos-nout/post-C-texte.webm` | Post 1:1 — Achète. Vends. |
| `videos-nout/story-site-reel.webm` | Story 9:16 — vraie page nout.re |
| `videos-nout/post-site-reel.webm` | Post 1:1 — vraie page nout.re |

---

## Session 14 juin 2026 — Changements appliqués

### Champs vêtements (étapes 51–53)
- `FASHION_CATS` = CLOTHING_CATS + `accessoires` + `sacs` — affiche le bloc Détails pour ces 6 catégories
- `traduireErreur()` dans CreateListing + EditListing — erreurs Supabase traduites en français
- Contrainte SQL `listings_condition_check` : `IS NULL OR condition IN (neuf_avec_etiquette, neuf_sans_etiquette, tres_bon_etat, bon_etat, etat_correct)`
- Catégorie `beaute` : champ État masqué du formulaire (removed from DOM → `required` HTML inactif), `condition = null` envoyé, reset auto au changement de catégorie
- Page 404 : `NotFound.jsx` + `<Route path="*">` dans App.jsx

### Page /installer-app PWA (étape 54)
- `InstallApp.jsx` : bouton natif `beforeinstallprompt` (Android Chrome), état "déjà installé", instructions manuelles iPhone/iPad + Android
- Section avantages sur fond `#0A0F2C`
- Lien "📲 Installer l'app" dans Footer colonne "Mon compte"
- Route `/installer-app` ajoutée dans App.jsx

### netlify.toml fix (session 14 juin)
- Ajout passage explicite `/.netlify/functions/*` AVANT le catch-all `/*` pour éviter que les fonctions soient interceptées par la SPA
- Résout le bug "test-email.js affiche la page React 404 au lieu du JSON"

### Pages légales charte + catalogue (étape 55)
- `CharteBonneConduite.jsx` : 8 sections (valeurs, règles vendeurs/acheteurs, comportements interdits, **annonces interdites dont lingerie usagée / cosmétiques ouverts / contrefaçons**, signalement, sanctions)
- `ReglementCatalogue.jsx` : 7 sections (catégories autorisées, articles interdits, photos, descriptions, prix, modération)
- Footer : 2 nouveaux liens dans la colonne Légal ("Charte de conduite", "Règlement catalogue")
- CGU section 10 "Documents complémentaires" avec liens cliquables vers les deux pages
- Routes : `/legal/charte-bonne-conduite` + `/legal/reglement-catalogue`

### Dernier commit
`ae387cc` — fix: slogan homepage — particuliers uniquement (15 juin 2026)
Précédent : `1625337` — feat: charte bonne conduite + règlement catalogue (14 juin 2026)

---

## Session 13 juin 2026 — Changements appliqués

### Migration email + URL
- `contact@nout974.re` → `contact@nout.re` dans **13 fichiers** (pages légales, About, Help, Footer, fonctions Netlify)
- `effortless-tapioca-c6ab25.netlify.app` → `nout.re` dans **8 fonctions Netlify** (ALLOWED_ORIGIN + SITE_URL)
- OG image et Twitter card → `https://nout.re/og-image.png`

### Optimisations PageSpeed
- `public/robots.txt` créé (`Allow: /`, sitemap `nout.re`)
- `ListingCard.jsx` : images Supabase redimensionnées → `?width=400&height=400&resize=cover`
- `index.html` : Google Fonts non-bloquant (`preload` + `media="print" onload`)

### Corrections contraste
- Bouton "Rechercher" : `bg-nout-turquoise` → `bg-[#007A6E]`
- Badge "NEW" : `bg-nout-turquoise` → `bg-[#007A6E]`
- Lien "Voir tout →" : `text-nout-turquoise` → `text-[#006B61]`
- Header "La Réunion 974" : restauré en `text-[#00C4B4]` (était devenu `text-white` invisible sur fond blanc)

### Audit sécurité — corrections appliquées
- **C-02** : `send-push.js` sécurisé — dual auth (secret interne `x-internal-secret` pour les fonctions serveur, JWT pour `messages.js` client)
- **C-04** : commandes `pending` orphelines — `create-checkout-session.js` ignore les pending > 1h ; `auto-refund.js` les annule automatiquement
- **C-05** : nouvelle fonction `admin-delete-user.js` — suppression RGPD admin complète (vérifie rôle admin + `supabase.auth.admin.deleteUser()`) ; `RGPD.jsx` mis à jour
- **I-07** : texte "IBAN chiffré et sécurisé" supprimé (était faux)
- **C-01** : `.env.local` jamais commité — vérifié ✅

### Bug profil
- `Profile.jsx` : `getUserListings` et `getSellerReviews` rendus non-bloquants — leur échec n'affiche plus "Profil introuvable" si le profil existe

### Sécurité dépôt git
- `.gitignore` racine créé → protège `NTUSER.DAT`, `AppData/`, `Downloads/`, `Dropbox/`, `.env`, `.env.local`, etc.

### C-06 Sécurité admin (commits d2a778d + 318282f)
- `netlify/functions/admin-actions.js` créé — vérifie JWT + rôle admin, route 10 actions (ban_user, unban_user, suspend_user, set_role, suspend_listing, restore_listing, remove_listing, delete_user_rgpd et variantes)
- `src/lib/adminApi.js` créé — helper `adminAction(action, targetId, extra?)`
- 4 pages admin mises à jour : UsersList, ListingsModeration, Reports, RGPD — plus aucun appel direct Supabase pour les écrits admin
- `SUPABASE_SERVICE_KEY` n'est plus jamais exposée côté client
- Score sécurité admin : 9/10

### Ban/Unban utilisateurs
- `profiles` : colonnes `is_banned` (boolean, default false) + `banned_at` (timestamptz) ajoutées via SQL Editor
- `UsersList.jsx` : colonne "Actions" avec bouton Bannir/Débannir par ligne, badge "banni" rouge dans colonne Rôle, protection compte admin grisé, loading state + erreur inline

---

## ✅ Production — état au 23 juin 2026 (COMPLET)

1. **SIRET ✅** — renseigné dans `MentionsLegales.jsx` et `SiteSettings.jsx`
2. **Stripe LIVE ✅** — clés live en production, webhook live fonctionnel (checkout.session.completed), testé avec un vrai achat : email reçu + code escrow généré, remboursements manuels effectués dans le dashboard Stripe
3. **Emails Resend ✅** — domaine `nout.re` vérifié, tous les emails depuis contact@nout.re
4. **Google OAuth ✅** — configuré dans Google Cloud Console pour `nout.re` (origines JS + URI redirection Supabase)
5. **Test escrow réel ✅** — flow complet testé avec un vrai acheteur, branche `test/escrow-home` validée

## 📋 Prochaines étapes (23 juin 2026)

- **test/escrow-home** — validée, à merger sur master
- **Membres Fondateurs** — SQL + Netlify + design sur master ✅ (session 18 juin) — reste : date annonce publique
- **ACRE URSSAF** — deadline ~31 juillet 2026 (45 jours après SIRET 16 juin) — externe au code
- **INPI** — dépôt marque NOUT (budget : 270 €)
- **Chronopost** — transporteur UNIQUE choisi (PAS UBN) : concentrer le volume sur un seul partenaire. Infrastructure de base déjà faite (update-order-shipping.js, tracking_number)

### Offre commerciale Chronopost reçue (23 juin 2026)
Deux services à La Réunion (hors Mafate) :
- **RELAIS DOM** (point relais, max 20kg) : **8,52€** tout inclus de 0 à 5kg, +0,25€/500g au-delà de 3kg
- **EXPRESS** (domicile, max 30kg) : **10,96€** tout inclus de 0 à 3kg, +0,25€/500g au-delà
- Tarifs incluent : Sûreté 0,82€ + éco-responsable 0,22€ + surcharge carburant (~21,75% en juin, variable)
- Délais 24h/48h ouvrés intra-île, assurance 250€ incluse, dépôt gratuit en point relais Pick-Up
- **Tarif point relais révisable À LA BAISSE selon volume colis/mois** → levier de négociation
- Intégration shipping e-commerce (Shopify/PrestaShop/WooCommerce) avec génération auto d'étiquettes → MAIS NOUT est React custom, pas une de ces plateformes : intégration à étudier (API Chronopost ou manuel)
- **Action requise : envoyer le KBIS** pour créer le compte société + recevoir les contrats (Express + Relais DOM)

### MODÈLE DE LIVRAISON DÉCIDÉ (24 juin 2026) — port = budget acquisition plafonné

Coût réel Chronopost facturé à NOUT en fin de mois selon volume : Relais DOM 8,52€ / Express domicile 10,96€.

**3 modes proposés dans le tunnel d'achat, hiérarchisés :**
1. 🤝 **Remise en main propre — GRATUITE** = option N°1 mise en avant. NOUT gagne 1,25–3,50€ (commission 5%+1€ inchangée). Code escrow 6 chiffres. C'est le gros du volume au 974, NOUT imbattable ici.
2. 📦 **Chronopost point relais — 4,99€** = PRIX D'APPEL marketing (moins cher que Kazakaz ~4€ UBN). NOUT subventionne ~3,83€/colis. **= budget pub PLAFONNÉ** (reco : ~40 colis/mois ≈ 155€/mois max, au-delà le 4,99€ se désactive et repasse au tarif réel).
3. 🏠 **Chronopost domicile — 8,90€** = vrai coût + petite marge, RENTABLE.

**Faits chiffrés (vérifiés par simulation Node) :**
- Port 4,99€ → NOUT perd ~3,83€/colis. Commission article ne couvre qu'à partir d'un article à ~57€.
- Donc 4,99€ N'EST PAS rentable au coût plein → assumé comme acquisition temporaire et BORNÉE.
- Le modèle se redresse seul : Chronopost baisse le tarif quand le volume monte (écrit dans leur offre).

**Décisions Amandine fermes :** Chronopost SEUL (pas UBN), livraison point relais à 4,99€, commission article inchangée 5%+1€. Ne pas être plus cher que Kazakaz au lancement = priorité absolue.

**Avantage différenciant vs Kazakaz :** la livraison NOUT inclut le paiement protégé/escrow (eux ne l'affichent pas). Plus pour moins cher.

**Point technique :** Chronopost propose intégration shipping Shopify/PrestaShop/WooCommerce — mais NOUT est React custom → intégration via API Chronopost ou semi-manuel (étiquette générée côté vendeur) à étudier avec leur service IT. KBIS déjà envoyé par Amandine, contractualisation lancée.

### FORMULE TARIFAIRE FINALE VALIDÉE (24 juin 2026)
Modèle décidé après plusieurs itérations de calcul (simulations Node vérifiées) :
- **Main propre : protection 5% + 1,00€, port 0€** → NOUT gagne 1,25–3,50€ (option principale, GRATUITE, moins chère que Kazakaz : 17,26€ vs ~19-21€ sur article 15€)
- **Chronopost point relais : protection 5% + 3,49€, port affiché 6,49€** → NOUT gagne 1,62–3,87€ (article 5€→50€), JAMAIS de perte même sur article 5€. Le port 6,49€ couvre une partie du coût Chronopost réel (8,52€), le reste vient de la protection majorée. Au niveau du Chronopost Kazakaz (6,51€).
- **Chronopost domicile : protection 5% + 3,49€, port ~8,90€** → marge gardée.

**Pourquoi pas moins cher que Kazakaz en livraison :** Kazakaz a UBN (transporteur local à 4€) + probablement trésorerie/investisseurs pour subventionner. NOUT n'a PAS de trésorerie → règle absolue = ZÉRO perte sur chaque colis. On ne peut pas matcher leur 4€ sans perdre. Le volume fera baisser le tarif Chronopost (promis dans leur offre) → on descendra naturellement. En attendant : main propre gratuite = arme principale.

Source de vérité code : `src/utils/shipping.js` (front) + `netlify/functions/create-checkout-session.js` (backend recalcule le total côté serveur, ne fait jamais confiance au client). Colonne `orders.shipping_method` ('hand'|'relay'|'home').

### PROJET SYSTÈME DE LOT (demandé 24 juin 2026 — à implémenter)
Amandine veut un système de LOT (bundle multi-articles même vendeur), comme Vinted.
**Pourquoi c'est clé :** le port (8,52€) est fixe par colis. En groupant N articles dans 1 seul colis, le port est partagé → coût/article chute (ex : 4 articles = port 1,62€/article au lieu de 6,49€). Gagnant×3 : acheteur économise gros (3 articles 5€ = 26,28€ groupé vs 46,86€ séparé), vendeur déstocke, NOUT garde sa marge sur chaque article + 1 seul colis à payer. NOUT positif sur tous les lots testés.
**Décision : feature à part entière, à faire APRÈS avoir verrouillé le tunnel livraison simple 1 article.** Mini-plan à valider avec Amandine (panier multi, regroupement par vendeur, port partagé, checkout groupé, 1 code escrow pour le lot ou par article ?).

### DÉPLOYÉ EN PROD le 24 juin 2026 (commit 638952a sur master, push → Netlify nout.re)
- **Tunnel livraison Chronopost** : 3 modes (main propre gratuite / relais 6,49€ / domicile 8,90€), protection majorée 5%+3,49€ en livraison, total recalculé côté serveur, orders.shipping_method, emails+Orders adaptés au mode. Fichiers : `utils/shipping.js`, `create-checkout-session.js`, `stripe-webhook.js`, `ListingDetail.jsx`, `Orders.jsx`, `EscrowConfirm.jsx`.
- **Espace Vendeur** `/espace-vendeur` : solde 3 états + stats business + récap ventes + annonces. Fichiers : `pages/SellerSpace.jsx`, `services/sellerStats.js`, lien dans Header.
- **UX publication** : Catégorie/État en chips (`components/ui/ChoiceChips.jsx`), titre suggéré auto + phrases-types description (`CreateListing.jsx`).
- **Carte produit** : ratio 4:5, hiérarchie marque/titre/taille·état/prix, fade image au chargement (`ListingCard.jsx`).
- **Menu profil** : emojis → icônes lucide (`Header.jsx`).
- **Note vendeur** sur fiche + popups prix/protection sur carte. Barre recherche effet typewriter (`Home.jsx`).

✅ ACTION SUPABASE FAITE : `orders.shipping_method` accepte maintenant 'hand'/'relay'/'home' (SQL exécuté par Amandine 24 juin).

⚠️⚠️ NE JAMAIS RETIRER `stripe` ET `web-push` DE package.json dependencies ⚠️⚠️
L'audit sécu #2 les avait retirés (croyant qu'ils étaient inutiles côté client) → MAIS ils sont REQUIS côté serveur par les fonctions Netlify : auto-refund.js, create-checkout-session.js, stripe-webhook.js (require('stripe')) + send-push.js (require('web-push')). Les retirer = build Netlify échoue ("Cannot find module 'stripe'"). Réinstallés le 24 juin (commit 306e05c) : stripe@22.2.3 + web-push@3.6.7. @supabase/supabase-js aussi requis (déjà présent). package-lock.json est gitignored (nout/.gitignore:11) — Netlify génère le sien.

### Étude UX/visuelle (voir nout/ETUDE-UX-VISUELLE-2026-06-24.md)
Modèle = Vinted (structure) + Grailed/Vestiaire (discipline mono/whitespace/typo/ratios) + 1 accent Wallapop. Garder Montserrat. TOP 5 facile : ratio 4:5 strict (✅ fait), carte type Vinted (✅ fait), palette mono+1 accent+whitespace, bottom nav Vendre central (✅ fait, déployé), skeletons+anim favori+fade (fade ✅). Reste : fiche 2 colonnes, formulaire photos réordonnables, lightbox.

## ⏸️ EN COURS — REPRISE le 24 juin 2026 (Amandine dit "il reste 90%, je reviens plus tard")

### CONSIGNE VISUELLE FERME D'AMANDINE (cf [[feedback-visuel]])
Le rendu actuel n'est PAS assez pro. Reproches précis sur screenshots :
1. **Espace Vendeur trop coloré** (cartes bleu/jaune/vert + dégradés + gras énorme) = "amateur" → REFAIT en SOBRE (✅ fait, pas encore commité) : fond blanc, bordures grises fines, monochrome, 1 seule touche turquoise discrète, plus de gras criard.
2. **EMOJIS PARTOUT** = pas pro. Amandine veut ZÉRO emoji. Elle ne veut PLUS avoir à signaler ça → TOUT nettoyer d'un coup.
3. Rester **sobre** partout (l'étude le disait : mono + 1 accent + whitespace).

### TRAVAIL EMOJI RESTANT (scan complet fait, ~30 fichiers) — À FAIRE
Remplacer TOUS les emojis par icônes lucide ou rien. Fichiers concernés (liste du scan node) :
- **Prioritaire (vu par utilisateurs)** : EscrowConfirm.jsx (🔒✅⏰❌🤝📦⏱), OrderToast.jsx (✅🤝💸🎉⚠️⏰), CreateListing.jsx (🚀✕), Conversation.jsx (👋💰⛔➤🌴), ReportModal.jsx (✅⚠️🚩), ErrorBoundary.jsx (😕), CropModal.jsx (✓), CompteActive.jsx (⏳❌✅), FounderBadge.jsx (🌴), Footer.jsx.
- **ListingDetail.jsx** : encore 💳 Acheter, 💰 Faire une offre, 💬 Contacter, 🚩 Signaler, 📍🕒👁📷🔝 — À VÉRIFIER/NETTOYER (scan ne les a pas tous remontés, re-scanner).
- **Admin** (moins urgent, pas vu par users) : AdminLayout, Dashboard, Finances, Reports, RGPD, SiteSettings, ListingsModeration.
- **DEV only (ignorables)** : BrandPage.jsx, BrandCompare.jsx (routes DEV uniquement).
Script de scan : recréer `node -e` avec regex emoji Unicode (voir historique) ou utiliser le pattern `/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}]/u`.

### ÉTAT GIT — NON COMMITÉ (à committer+push à la reprise APRÈS nettoyage emoji complet)
- SellerSpace.jsx refait sobre (build OK, pas commité)
- Reste tout le nettoyage emoji
- Dernier commit poussé en prod : 306e05c (fix stripe/web-push + bottom nav + skeleton). ⚠️ VÉRIFIER que ce déploiement Netlify est bien passé VERT (le précédent 638952a avait échoué sur stripe manquant).

### ✅ REFONTE VISUELLE V1 DÉPLOYÉE (commit f9e3e96, 24 juin 2026, sur nout.re)
Direction validée par Amandine : MÉLANGE site actuel + mockup. Garder hero animé + footer + boutons dégradé turquoise. Voir nout/MOCKUP-DESIGN/ (mockups HTML) + CE-QU-ON-GARDE.md.
Fait et déployé :
- Eyebrows signature "• EXPLORE / FRAÎCHEMENT PUBLIÉ / SIMPLE COMME BONJOUR •" (points turquoise = rappel logo)
- Titres section 28px (plus de caractère)
- Cartes produit allégées (marque/titre/prix/lieu, ratio 4:5) + grille dense 5 col
- **Espace Vendeur refait SOBRE** (fond blanc, bordures grises fines, fini les dégradés bleu/jaune/vert criards) — c'était LE truc "affreux" qu'Amandine voulait corriger
- Faux-beige `bg-orange-50` déco éliminé (About/Help/ListingDetail/Search/Login/Register) → turquoise pâle #EAF6F5. Alertes orange légitimes (Login/Orders) préservées.
- Section "Comment ça marche" : crème → bleu-gris clair #EEF3F8
- Catégories accueil SANS icônes (texte seul)
- Palmiers hero non coupés (viewBox -30 vers le haut)
- Emoji 🌴/🏝️ hero retirés → icônes lucide. Badge Fondateur en corail #FF6B4A.

### MCP INSTALLÉS (24 juin) : playwright + context7 (claude mcp add). Chromium OK. Permet captures/voir le rendu.

### PROCHAINES ÉTAPES VISUELLES (reste à faire)
1. **Nettoyer emojis pages internes** (toasts OrderToast, EscrowConfirm, Conversation, modales ReportModal, CropModal, CompteActive, admin) — gros chantier, ~25 fichiers
2. Fiche produit 2 colonnes (galerie sticky / infos+CTA)
3. Formulaire publication amélioré (photos réordonnables)
4. Système de LOT (demandé, gros chantier)
5. ⚠️ Note : SellerSpace.jsx version sobre était non commitée → MAINTENANT déployée (f9e3e96)

## Analyse concurrentielle (23 juin 2026) — voir nout/ANALYSE-CONCURRENTIELLE-2026-06-23.md

4 agents : audit codebase NOUT + Kazakaz.re + Vinted + marché européen.

**Kazakaz (concurrent 974)** : 312 users actifs, 420 annonces, PWA-only. Force = création annonce IA. Faiblesse = petite base, commission cachée, pas de programme fondateurs.

**Décisions Amandine :**
- **IA photo ÉCARTÉE** (pas une priorité)
- **Chronopost SEUL** (pas UBN) — volume + réductions

**NOUT est DÉJÀ au niveau du socle.** Manque la couche croissance/conversion.

**Roadmap priorisée (sans IA) :**
- 🔴 Vague 1 (quick wins) : articles similaires sur fiche, bouton "Faire une offre" direct, badge "Bonne Affaire" auto, alerte baisse prix favoris, recherches sauvegardées + alertes push
- 🟠 Vague 2 : parrainage (acquisition #1 local), follow vendeur + feed, stats vendeur publiques, badge identité vérifiée, géoloc par zone 974 (Nord/Sud/Est/Ouest — différenciateur unique)
- 🟢 Vague 3 : livraison Chronopost intégrée, remise en main propre sécurisée QR code, boost payant + analytics, wallet interne, impact CO2 + badges locaux

**Avantages à mettre en avant tout de suite (gratuit) :** Membres Fondateurs, transparence des frais, communauté 100% réunionnaise par zone.

## 📋 À faire (features restantes)

- Livraison transporteur 974 (phase 2)
- Points relais (phase 2)
- Apple Sign In (phase 2)

---

## Charte graphique (validée)

**Logo validé : N°5** — NOUT blanc sur fond #0A0F2C, "La Réunion 974" turquoise `#00C4B4`.

### Palette officielle
| Variable CSS | Valeur | Usage |
|---|---|---|
| `--nout-nuit` | `#0A0F2C` | Fond hero, footer |
| `--nout-roi` | `#1A3A8F` | Bleu roi signature, prix |
| `--nout-lagon` | `#0E7FAB` | Bleu lagon |
| `--nout-turquoise` | `#00C4B4` | Accent CTA, hover, badges |
| `--nout-creme` | `#F5F0E8` | Fond section crème |
| `--nout-texte` | `#1A1A2E` | Texte principal |
| `--nout-muted` | `#6B7A99` | Texte secondaire |
| `--nout-fond` | `#F8FAFF` | Fond général |

**Polices : Montserrat** (titres `font-title`) + **Inter** (corps `font-sans`) — via Google Fonts.

**Note contraste** : boutons CTA et badges utilisent `bg-[#007A6E]` (vert foncé, meilleur contraste) au lieu de `bg-nout-turquoise`. Le turquoise `#00C4B4` reste pour les accents décoratifs (points logo, hover).

---

## Architecture escrow (flow complet)

1. Vendeur publie librement (aucune config Stripe requise)
2. Acheteur clique "Acheter" → `create-checkout-session` :
   - Vérifie JWT, buyer≠seller, is_active, pas de double-commande active (pending < 1h seulement)
   - Crée order `pending` + code escrow 6 chiffres (expire J+7)
   - Crée session Stripe Checkout (argent bloqué sur compte NOUT)
3. Paiement Stripe → webhook `checkout.session.completed` :
   - Order → `paid`, annonce → `is_sold = true`
   - Email acheteur avec code 6 chiffres + email vendeur
4. Remise en main propre → acheteur donne le code au vendeur
5. Acheteur voit son code dans Mes commandes (onglet Achats, statut `paid`) — `BuyerEscrowCode` lit `escrow_codes` via RLS
6. Vendeur saisit code dans `EscrowConfirm.jsx` → `confirm-escrow` :
   - Vérifie JWT seller_id AVANT d'accéder au code (protection dès l'entrée)
   - Rate limiter persistant : 3 mauvais codes → `locked_until = now+1h` (stocké en base)
   - Messages progressifs : "Il te reste 2 tentatives" → "Dernière tentative !" → "Bloqué 1h"
   - Bon code : `confirmed_at` + reset `attempt_count=0` + `locked_until=null` en une seule opération atomique
   - Stripe Transfer si `stripe_account_id` → `completed`, sinon → `payout_pending`
7. Cron toutes les heures → `auto-refund` :
   - Annule `pending` > 1h + remet annonces en ligne
   - Codes expirés + `confirmed_at IS NULL` + `refunded_at IS NULL` → remboursement Stripe
   - Annonce remise en ligne automatiquement — une remise confirmée n'est JAMAIS remboursée

### RLS escrow_codes (SQL appliqué)
```sql
-- Acheteur lit son propre code
CREATE POLICY "acheteur peut lire son code escrow" ON escrow_codes FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE buyer_id = auth.uid()));
-- Vendeur lit son propre code (pour EscrowConfirm)
CREATE POLICY "vendeur peut lire son code escrow" ON escrow_codes FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE seller_id = auth.uid()));
```

### Statuts commande
| Statut | Label | Couleur |
|---|---|---|
| `pending` | En attente | jaune |
| `paid` | Paiement reçu | bleu |
| `shipped` | Expédiée (UBN Speed) | bleu-clair |
| `completed` | Remise faite | vert |
| `payout_pending` | Virement en attente | orange |
| `refunded` | Remboursé | gris |
| `cancelled` | Annulé | gris |
| `disputed` | Litige | rouge |

---

## Fonctions Netlify (liste complète)
| Fichier | Rôle |
|---|---|
| `create-checkout-session.js` | Crée session Stripe + order + code escrow |
| `stripe-webhook.js` | Gère événements Stripe (paiement, account) |
| `confirm-escrow.js` | Valide code + déclenche transfert Stripe |
| `auto-refund.js` | Cron J+7 — annule pending orphelins + remboursements automatiques |
| `create-connect-account.js` | Onboarding Stripe Connect vendeur |
| `send-push.js` | Envoie notification push VAPID — auth dual (x-internal-secret ou JWT) |
| `send-warning.js` | Avertissement admin → utilisateur (email Resend) |
| `delete-account.js` | Suppression compte utilisateur (auto-suppression) |
| `admin-delete-user.js` | Suppression RGPD admin — vérifie rôle admin + deleteUser Supabase |
| `admin-actions.js` | Router sécurisé actions admin (JWT+rôle) — 10 actions : ban, suspend, set_role, listing, delete RGPD |
| `submit-review.js` | Soumet un avis après vente + email vendeur |
| `update-order-shipping.js` | Vendeur marque commande comme expédiée (paid → shipped) + numéro de suivi UBN |

---

## Détails techniques importants

- **Auth** : trigger Supabase crée profil auto — ne JAMAIS faire INSERT manuel dans `profiles`
- **Admin** : passer `role = 'admin'` dans `profiles` via Supabase Dashboard
- **Message de bienvenue** : `localStorage` clé `nout_welcome_seen`
- **Stripe commission** : `fraisFixe = 1€` + `fraisVariable = prix × 5%` → total acheteur
- **Avatar** : centralisé dans `utils/avatar.js` → `getAvatarUrl(avatarPath)`
- **CSS @apply** : utiliser hex directs ex: `bg-[#00C4B4]` pas `bg-nout-turquoise` dans @apply
- **useUnreadCount.js SUPPRIMÉ** — compteur dans `AuthContext.jsx` via canal `unread-${user.id}`
- **ScrollToTop** : composant dans `App.jsx`, scroll vers le haut à chaque changement de route
- **Git** : branche `master`, remote `origin` → GitHub → Netlify déploie automatiquement
- **Dernier commit** : `3035fac` — docs: récap session 18 juin 2026 — session 18 juin : b84ec5f, f9e972d, 3ff97c7, 00e0138 (Membres Fondateurs complet) — session 17 juin : 00d0dc2, 3ae61e4, 4dda7cf, ed92da5, 10dbd27
- **Champs vêtements** : `FASHION_CATS = ['vetements-femme','vetements-homme','vetements-enfant','chaussures','accessoires','sacs']` — taille obligatoire pour `CLOTHING_CATS` seulement, beaute exempt du champ État — sections dans CreateListing + EditListing + badges sur ListingDetail
- **CONDITIONS** : `neuf_avec_etiquette`, `neuf_sans_etiquette`, `tres_bon_etat`, `bon_etat`, `etat_correct` (underscores) — contrainte SQL `IS NULL OR IN (...)` — catégorie `beaute` envoie `null`
- **404** : `NotFound.jsx` + `<Route path="*">` dans App.jsx
- **Escrow rate limiter** : `attempt_count` + `last_attempt_at` + `locked_until` dans `escrow_codes` — 3 tentatives max puis 1h de verrou — logs console pour détection anomalies
- **BuyerEscrowCode** : composant inline dans `Orders.jsx` — lit `escrow_codes` pour l'acheteur (status `paid`) — code 32px #007A6E avec espacement — alerte orange sécurité
- **Reviews** : colonne `reviewer_id` (pas `buyer_id`) — FK join `profiles!reviews_reviewer_id_fkey`
- **Push icon** : `nout-icon-192.png` dans `public/` — exclu de `.gitignore` via `!nout/frontend/public/*.png`
- **compressImage** : fallback timer 10s si canvas.toBlob ne répond jamais + fallback original si blob null
- **CropModal** : canvas limité à 1200px (évite crash iOS 12MP), reject + catch + affichage erreur
- **uploadAvatar** : même fix que uploadListingImage — `file.name ?? 'avatar.jpg'`
- **uploads** : timeout 45s via Promise.race dans CreateListing + EditListing
- **lucide-react** : installé comme dépendance — Heart (ListingCard, Header), Share2 (ListingDetail)
- **Icônes PWA** : générées via `scripts/generate-icons.mjs` (sharp) — fond `#1A1A2E`, N réduit ~11%
- **Favoris** : table `favorites` (RLS ✅) — service `favorites.js` — bouton Heart sur ListingCard + ListingDetail — page `/favoris` — lien Header dropdown + BottomNav
- **Partage** : bouton Share2 — mobile → `navigator.share()` natif — desktop → dropdown WhatsApp + copier lien
- **Catégories** : 7 uniquement — `vetements-femme`, `vetements-homme`, `vetements-enfant`, `chaussures`, `accessoires`, `sacs`, `beaute` — dans `utils/categories.js`
- **CLOTHING_CATS** : `['vetements-femme','vetements-homme','vetements-enfant','chaussures']` — constante dans CreateListing + EditListing pour l'affichage conditionnel du bloc détails vêtement
- **Tailles** : SIZES_VETEMENTS (XS→3XL+Unique), SIZES_CHAUSSURES (35→46), SIZES_ENFANT (3 mois→14 ans) — constantes module-level dans Create/EditListing
- **Couleurs** : 13 choix fixes — Blanc, Noir, Gris, Beige, Marron, Rouge, Rose, Orange, Jaune, Vert, Bleu, Violet, Multicolore
- **Images ListingCard** : URL Supabase + `?width=400&height=400&resize=cover` pour perf mobile
- **send-push sécurisé** : appels serveur → header `x-internal-secret: CRON_SECRET` ; appel client (messages.js) → header `Authorization: Bearer <token>`
- **Profile.jsx** : `getUserListings` et `getSellerReviews` non-bloquants (`.catch(() => [])`) — seul `getProfile` peut déclencher "Profil introuvable"
- **IBAN** : stocké en clair dans `profiles` — ne pas écrire "chiffré" dans l'UI
- **robots.txt** : présent dans `public/` — `Allow: /`, sitemap `https://nout.re/sitemap.xml`

---

## Pages (liste complète)

**Publiques :** `Home`, `Search`, `ListingDetail`, `Profile`, `About`, `Help`, `HowItWorks`, `InstallApp`, `NotFound`
**Auth :** `Login`, `Register`, `PaymentSuccess`
**Privées :** `CreateListing`, `EditListing`, `Messages`, `Conversation`, `Orders`, `Favorites`, `Settings`
**Admin :** `AdminLayout`, `Dashboard`, `ListingsModeration`, `ListingReview`, `UsersList`, `UserDetail`, `OrdersList`, `Reports`, `Finances`, `RGPD`, `SiteSettings`
**Légales :** `CGU`, `CGV`, `Privacy`, `Cookies`, `MentionsLegales`, `CharteBonneConduite`, `ReglementCatalogue`

## Composants notables
`ListingCard`, `EscrowConfirm`, `PriceRangeSection`, `ReportModal`, `CropModal`, `SkeletonCard`, `ReviewCard`, `Stars`, `ErrorBoundary`, `MessageToast`, `OrderToast`, `CookieBanner`, `BottomNav`, `BackButton`

## Services Supabase
`listings.js`, `profiles.js`, `messages.js`, `favorites.js`, `orders.js`, `reviews.js`, `reports.js`, `supabase.js`

## Utils
`avatar.js`, `formatters.js`, `categories.js`, `cities.js`, `imageCompressor.js`, `forbiddenWords.js`
