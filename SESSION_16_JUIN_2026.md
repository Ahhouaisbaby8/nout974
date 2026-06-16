# Session 16 juin 2026 — NOUT 974

## Sécurité — Audit #1 (score 6/10 → 8.5/10)

| Fichier | Correction |
|---------|-----------|
| `netlify/functions/send-welcome.js` | Rate limiter IP — 3 req/min |
| `src/services/profiles.js` + `src/pages/Profile.jsx` | `getPublicProfile()` : IBAN, téléphone, stripe_account_id exclus des profils publics |
| `netlify/functions/delete-account.js` | Blocage suppression si commandes actives (statut `paid`) |
| `netlify/functions/admin-actions.js` | `banned_at: now()` au ban, `null` au unban |
| `src/pages/admin/users/UsersList.jsx` | Email personnel hardcodé supprimé |
| `netlify/functions/send-warning.js` | Domaine `nout974.re` → `nout.re` |
| `src/pages/Register.jsx` | Mot de passe minimum 8 caractères (OWASP) |
| `src/services/orders.js` | Fonctions mortes `createOrder` et `updateOrderStatus` supprimées |

---

## Sécurité — Audit #2 — Corrections P1 → P2 → P3

### P1 — Critique
| Fichier | Correction |
|---------|-----------|
| `netlify.toml` | 6 headers HTTP ajoutés : CSP, X-Frame-Options (DENY), HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| `netlify/functions/confirm-escrow.js` | Vérification statut `['paid', 'shipped']` obligatoire avant tout transfert Stripe |

### P2 — Important
| Fichier | Correction |
|---------|-----------|
| `src/pages/Settings.jsx` | IBAN masqué par défaut (`**** **** **** 143`), bouton "Modifier" pour édition explicite |
| `netlify/functions/create-checkout-session.js` | `Math.random()` → `crypto.randomInt(100000, 1000000)` pour la génération du code escrow |
| `package.json` | `npm audit fix` — 0 vulnérabilités (`form-data` HIGH + `dompurify` LOW corrigées) |

### P3 — Modéré
| Fichier | Correction |
|---------|-----------|
| `netlify/functions/stripe-webhook.js` | Email destinataire retiré du `console.log` (logs Netlify) |
| `package.json` | `stripe`, `web-push`, `axios` supprimés des dépendances frontend (packages serveur) |

---

## Supabase RLS — SQL généré pour toutes les tables

| Table | Politique appliquée |
|-------|-------------------|
| `orders` | SELECT → `buyer_id = auth.uid() OR seller_id = auth.uid()` |
| `messages` | SELECT/INSERT expéditeur ou destinataire, UPDATE destinataire (`is_read`) |
| `escrow_codes` | 0 policy = 0 accès client (SERVICE_KEY uniquement côté serveur) |
| `listings` | SELECT public, INSERT/UPDATE/DELETE limités au propriétaire |
| `reports` | INSERT tout utilisateur authentifié, SELECT/UPDATE admin uniquement |
| `push_subscriptions` | SELECT/INSERT/DELETE limités au propriétaire |
| `reviews` | SELECT public, INSERT limité au reviewer (immuable) |

---

## Logistique — Flux d'expédition

| Élément | Détail |
|---------|--------|
| `netlify/functions/update-order-shipping.js` | Nouvelle fonction : JWT + vérification `seller_id` + idempotence (`.eq('status', 'paid')`) |
| `src/pages/Orders.jsx` | `SellerShippingPanel` : vendeur saisit numéro de suivi (statut `paid` → `shipped`) |
| `src/pages/Orders.jsx` | `BuyerTrackingPanel` : acheteur voit le numéro de suivi (statut `shipped`) |
| SQL exécuté | `ALTER TABLE orders ADD COLUMN tracking_number TEXT, ADD COLUMN shipped_at TIMESTAMPTZ` |
| Mentions UBN Speed | Supprimées du site — formulations génériques en attente de partenariat officiel |

---

## Mentions légales — SIRET

| Fichier | Modification |
|---------|-------------|
| `src/pages/legal/MentionsLegales.jsx` | SIRET `106 334 436 00016` et SIREN `106 334 436` ajoutés |
| `src/pages/legal/MentionsLegales.jsx` | Domaine `nout974.re` → `nout.re` corrigé |
| `src/pages/admin/SiteSettings.jsx` | SIRET et domaine mis à jour dans le panel admin |

---

## Dépendances frontend nettoyées

Supprimés de `package.json` (inutilisés côté client) :
- `@stripe/react-stripe-js`
- `@stripe/stripe-js`
- `stripe`
- `web-push`
- `axios`

Le flux Stripe utilise un redirect côté serveur — aucun `loadStripe()` ni Stripe Elements dans `src/`.

---

## Commits du jour

| Hash | Message |
|------|---------|
| `d10d487` | legal: ajout SIRET 106 334 436 00016 + correction domaine nout.re |
| `f0f4314` | chore: suppression @stripe/react-stripe-js et @stripe/stripe-js |
| `942b718` | chore: suppression mentions UBN Speed — formulations génériques |
| `fc452c5` | security: audit #2 — headers HTTP, escrow, IBAN masking, crypto |
| `a9bfaad` | feat: flux expédition UBN (update-order-shipping + Orders.jsx) |

---

## Prochaines étapes

- [ ] Passer Stripe en mode **production** (clés live) — SIRET disponible
- [ ] **Google OAuth** — mettre à jour origines JS + URI dans Google Cloud Console pour `nout.re`
- [ ] **ACRE URSSAF** — dossier à déposer dans les 45 jours suivant la date du SIRET
- [ ] **INPI** — dépôt de la marque NOUT (budget : 270 €)
- [ ] **Chronopost** — intégration transporteur (phase 2, après partenariat)
- [ ] **Partenariat logistique** — contact hello@ubn-speed.re en cours
