# NOUT 974 — Marketplace Seconde Main La Réunion

> **NOUT** = *"le nôtre"* en créole réunionnais · Communauté · Partage · Fierté 974

Marketplace de vente de seconde main 100 % réunionnaise. Achetez et vendez partout à La Réunion.

---

## Liens importants

| | |
|---|---|
| **GitHub** | https://github.com/Ahhouaisbaby8/nout974 |
| **Netlify (prod)** | URL à confirmer dans le dashboard Netlify |
| **Supabase** | https://pvimybfqfhrvpnmkcepy.supabase.co |
| **Contact** | contact@nout974.re |

---

## État du projet — 5 juin 2026

### ✅ Terminé (12 étapes sur 12)

| Étape | Fonctionnalité |
|---|---|
| 1 | Setup React + Vite + Tailwind + Supabase |
| 2 | Page d'accueil (hero, catégories, annonces récentes) |
| 3 | Authentification email + Google OAuth |
| 4 | Formulaire de publication d'annonce + compression images |
| 5 | Page détail annonce (partage WhatsApp, signalement, avis) |
| 6 | Profil utilisateur + Paramètres |
| 7 | Messagerie temps réel (Supabase Realtime) + badge non lus |
| 8 | Recherche + filtres (URL synchronisée) |
| 9 | Stripe Connect — paiements sécurisés (mode test) |
| 10 | Panel Admin complet (modération, utilisateurs, rapports, finances) |
| 11 | Pages légales (CGU, CGV, Mentions légales, RGPD, Cookies) |
| 12 | Déploiement Netlify + CI/CD GitHub |

### ✅ Derniers ajouts (session du 5 juin 2026)

#### Fix — Crash Supabase Realtime
- **Problème** : `useUnreadCount` était appelé dans `Header` ET `BottomNav`, créant deux abonnements avec le même nom de channel (`unread-{userId}`) → erreur Supabase après `subscribe()`
- **Correction** : logique déplacée dans `AuthContext` → un seul abonnement partagé via le contexte

#### Feat — Identité visuelle complète (direction Hibiscus 🌺)
- **Logo SVG** typographique — "NOUT" ExtraBold + trait hibiscus + "RÉUNION 974"
- **Favicon SVG** — N blanc sur fond hibiscus #D94F5C
- **Logo blanc** — pour fonds sombres (footer, bannières)
- **Composant `Logo.jsx`** — réutilisable avec props `variant` (color/white/icon-only) et `size` (sm/md/lg/xl)
- **Charte graphique** — `src/styles/brand.css` : variables CSS complètes + classes utilitaires
- **Palette hibiscus** — `#D94F5C` rouge hibiscus (fleur emblème de La Réunion)
- **Polices** — Plus Jakarta Sans (titres) + DM Sans (corps) via Google Fonts
- **`tailwind.config.js`** mis à jour avec la palette hibiscus
- **Page `/brand`** — aperçu charte graphique (accessible uniquement en mode dev)
- **Header** mis à jour avec le vrai logo SVG

### ⚠️ À finaliser (bloquants pour le lancement)

| # | Action | Où |
|---|---|---|
| 1 | **Obtenir le SIRET** (auto-entreprise) | Guichet-entreprises.fr |
| 2 | **Remplir `[À compléter]`** dans les Mentions légales | `src/pages/legal/MentionsLegales.jsx` |
| 3 | **Passer Stripe en mode live** | Variables d'env Netlify + Dashboard Stripe |
| 4 | **Configurer Google OAuth** pour l'URL Netlify | Google Cloud Console |

---

## Stack technique

| Couche | Outil | Version |
|---|---|---|
| Frontend | React | 18 |
| Build | Vite | 8 |
| Style | Tailwind CSS | v3 |
| Backend / Auth / BDD | Supabase (PostgreSQL + RLS) | v2 |
| Hébergement | Netlify | — |
| Paiements | Stripe Connect | mode test |
| Fonts | Plus Jakarta Sans · DM Sans | Google Fonts |

---

## Structure du projet

```
nout/
├── README.md                    ← ce fichier
├── netlify.toml                 ← config déploiement Netlify
├── supabase/
│   └── schema.sql               ← schéma BDD complet (tables + RLS + triggers)
└── frontend/                    ← application React
    ├── .env.local               ← variables d'environnement (⚠️ ne pas committer)
    ├── index.html
    ├── tailwind.config.js       ← palette hibiscus + fonts
    ├── vite.config.js
    ├── netlify/
    │   └── functions/           ← fonctions Stripe (Netlify Functions)
    │       ├── create-checkout-session.js
    │       ├── stripe-webhook.js
    │       └── create-connect-account.js
    └── src/
        ├── assets/
        │   ├── logo.svg         ← logo couleur (fond clair)
        │   ├── logo-white.svg   ← logo blanc (fond sombre)
        │   └── favicon.svg      ← icône N hibiscus
        ├── components/
        │   ├── Logo.jsx         ← composant logo réutilisable
        │   ├── layout/          ← Header, Footer, BottomNav
        │   ├── legal/           ← CookieBanner
        │   └── ui/              ← ErrorBoundary, ListingCard, Spinner...
        ├── context/
        │   └── AuthContext.jsx  ← auth + badge messages non lus
        ├── hooks/
        │   └── useUnreadCount.js
        ├── pages/
        │   ├── Home.jsx
        │   ├── Search.jsx
        │   ├── ListingDetail.jsx
        │   ├── Profile.jsx
        │   ├── Messages.jsx / Conversation.jsx
        │   ├── Favorites.jsx
        │   ├── Orders.jsx
        │   ├── Settings.jsx
        │   ├── CreateListing.jsx / EditListing.jsx
        │   ├── BrandPage.jsx    ← aperçu charte (dev only, /brand)
        │   ├── admin/           ← panel admin complet
        │   └── legal/           ← CGU, CGV, Privacy, Cookies, MentionsLegales
        ├── services/            ← appels Supabase (listings, profiles, messages...)
        ├── styles/
        │   └── brand.css        ← variables CSS + classes utilitaires NOUT
        └── utils/               ← formatters, categories, cities, avatar, imageCompressor
```

---

## Lancer en local

```powershell
cd C:\Users\Amandine\nout\frontend
npm run dev
# → http://localhost:5173
```

Aperçu charte graphique (dev uniquement) :
```
http://localhost:5173/brand
```

---

## Variables d'environnement

### `frontend/.env.local` (local — ne jamais committer)
```env
VITE_SUPABASE_URL=https://pvimybfqfhrvpnmkcepy.supabase.co
VITE_SUPABASE_ANON_KEY=ta_cle_anon
```

### Netlify — Site configuration → Environment variables
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_URL` | URL Supabase (fonctions Netlify) |
| `SUPABASE_SERVICE_KEY` | Clé service_role Supabase |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (après création auto-entreprise) |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe |

---

## Identité visuelle — Direction Hibiscus 🌺

| Élément | Valeur |
|---|---|
| Couleur signature | `#D94F5C` — rouge hibiscus |
| Couleur hover | `#B83847` |
| Fond principal | `#FDFBFB` — blanc chaud |
| Texte principal | `#1A0A0C` — noir chaud |
| Police titres | Plus Jakarta Sans (800) |
| Police corps | DM Sans (400/500/600) |
| Concept logo | Typographie forte · "NOUT" ExtraBold · sans icône |

---

## Déploiement

Le déploiement est **automatique** : chaque push sur `master` déclenche un build Netlify.

```
netlify.toml
  base    = "nout/frontend"
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

---

## Supabase — Points importants

- Le **trigger** Supabase crée automatiquement le profil à l'inscription → ne jamais faire d'`INSERT` manuel dans `profiles` après `signUp()`
- **Admin** : passer `role = 'admin'` dans la table `profiles` via le Dashboard Supabase
- **RLS** activé sur toutes les tables
- **Google OAuth** configuré dans Supabase → Authentication → Providers → Google (ajouter l'URL Netlify dans Google Cloud Console)
