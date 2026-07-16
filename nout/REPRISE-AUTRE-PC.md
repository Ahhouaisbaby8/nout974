# 📦 NOUT — Récap complet pour reprendre sur un autre ordinateur

> Ce fichier contient TOUTE la mémoire du projet NOUT au **28 juin 2026**.
> Il est dans le repo GitHub → il arrive automatiquement sur l'autre PC via `git clone` / `git pull`.
> **Sur l'autre Claude Code, dis simplement : « Lis le fichier `nout/REPRISE-AUTRE-PC.md` à la racine du projet et reprends NOUT à partir de là. »**

---

## 0. DÉMARRAGE SUR LE NOUVEAU PC (à faire une seule fois)

```bash
# 1. Récupérer le projet
git clone https://github.com/Ahhouaisbaby8/nout974
cd nout974/nout/frontend

# 2. Installer les dépendances
npm install

# 3. ⚠️ Recréer le fichier .env.local (voir section 1 ci-dessous) — il n'est PAS sur GitHub

# 4. Lancer en local
npm run dev   # → http://localhost:5173
```

**Workflow 2 PC (règle d'or) :** je travaille sur UN seul PC à la fois.
- **Au début de chaque session :** `git pull` (récupère ce que l'autre PC a poussé)
- **À la fin de chaque session :** `git add -A && git commit -m "..." && git push`
- Branche : **master**. Netlify déploie nout.re automatiquement à chaque push. Supabase est dans le cloud (partagé par tous).

---

## 1. ⚠️ Fichier .env.local à recréer (clés NON présentes sur GitHub)

Crée `nout/frontend/.env.local` avec ces variables (récupère les VALEURS depuis le dashboard Supabase, ou copie-le depuis l'ancien PC via clé USB) :

```
VITE_SUPABASE_URL=https://pvimybfqfhrvpnmkcepy.supabase.co
VITE_SUPABASE_ANON_KEY=<clé anon Supabase — dashboard Supabase > Settings > API>
VITE_APP_URL=https://nout.re
VITE_VAPID_PUBLIC_KEY=<clé publique VAPID — voir variables Netlify>
```

Les clés SECRÈTES (Stripe, service key Supabase, Resend, VAPID privée, CRON_SECRET) **ne sont PAS dans le code** : elles sont uniquement dans les **variables d'environnement Netlify** (côté serveur). Tu n'en as pas besoin pour développer en local — seulement l'ANON key et l'URL Supabase.

---

## 2. C'EST QUOI NOUT

Marketplace de vente d'articles de **seconde main**, ciblant **exclusivement La Réunion (974)**.
- Nom : **NOUT** · Contact : contact@nout.re · Saint-Denis 974
- En ligne : **https://nout.re** (domaine principal actif)
- Cible : mode/beauté seconde main entre particuliers (C2C, type Vinted local)
- Porteur du projet : **Dawson BOYER** (signature dans les communications pro)

### Emplacements
| Où | Chemin / URL |
|---|---|
| GitHub | https://github.com/Ahhouaisbaby8/nout974 |
| Code React | `nout/frontend/` |
| Netlify | https://nout.re (fallback effortless-tapioca-c6ab25.netlify.app) |
| Supabase | https://pvimybfqfhrvpnmkcepy.supabase.co |

### Stack
| Couche | Outil |
|---|---|
| Frontend | React 18 + Vite |
| Style | Tailwind CSS v3 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Hébergement | Netlify (EN LIGNE sur nout.re) |
| Paiements | Stripe Connect (mode LIVE, fonctionnel) |

---

## 3. RÈGLES DE TRAVAIL (très important — à respecter tout le temps)

1. **Tout en français** (code, commentaires, textes UI, messages d'erreur).
2. **MOBILE = priorité absolue.** La majorité des users sont sur mobile. Tester le rendu mobile (390px) à chaque changement visuel.
3. **PAS d'emojis dans l'interface.** Utiliser les icônes **lucide-react** à la place (ça fait pro).
4. **Le VISUEL et la SIMPLICITÉ avant tout.** Design soigné, hiérarchie claire, whitespace, palette nuit/turquoise. S'inspirer de Vinted/Depop/Vestiaire/Grailed. Quand on hésite entre "plus de features" et "plus simple/beau" → choisir simple/beau.
5. **Donner une recommandation CLAIRE et assumée**, pas une liste d'options neutres. « Je te recommande X parce que… ». Être autonome sur les choix techniques simples (trancher et annoncer). Réserver les vraies questions à : argent/tarifs, design à valider visuellement, priorité métier, goût.
6. **Valider étape par étape** les grandes décisions (architecture, design) AVANT de coder.
7. **Commit + push après chaque feature.** + tenir à jour `nout/SUIVI-SESSIONS/` (journal détaillé) = sauvegarde externe.
8. Police : **Montserrat** (titres `font-title`) + Inter (corps). PAS Syne.
9. Écrire **"Le marketplace"** (masculin), pas "La marketplace".
10. **Supabase only** pour le backend (jamais re-proposer PocketBase).

### Profil d'Amandine
Non-développeuse, débutante/intermédiaire. Travaille sur Windows 11, VS Code + Claude Code, shell PowerShell. A besoin d'explications simples étape par étape et de **visuels** (screenshots) pour voir l'avancement.

---

## 4. CE QUI EST FAIT (état au 28 juin 2026)

Le **socle est complet** (55+ étapes) : auth email + Google OAuth, publication annonces, fiche produit, profil + paramètres, messagerie temps réel, recherche + filtres, **Stripe Connect LIVE fonctionnel**, webhook Stripe, emails Resend (domaine nout.re vérifié), notifications push VAPID, panel admin complet, pages légales, **système escrow complet** (code 6 chiffres, remise main propre), favoris, avis/notation, partage, ban/unban, **SIRET renseigné**, audits sécurité #1 et #2 appliqués.

### Features récentes notables
- **Tunnel livraison** : 3 modes (main propre GRATUITE / Chronopost relais 6,49€ / domicile 8,90€), total recalculé côté serveur, `orders.shipping_method`.
- **Espace Vendeur** `/espace-vendeur` (sobre, stats, graphique gains, virements).
- **Système Abonnés/Follow** (table `follows`, bouton S'abonner, notif push).
- **Profil amélioré** : bannière fondateur (dégradé hero + palmier + anneau doré, réservée aux 50 Membres Fondateurs), onglets Articles/Avis, badge Email confirmé.
- **Membres Fondateurs** : 50 premiers (5 publications + 1 transaction → badge doré + bannière).
- **Espace Créateurs péi Phase 1** : badge + catégorie + toggle + page `/createurs` (commission seule).
- **Fiche produit type Vinted** (tableau d'attributs).
- **Sous-catégories** dans la recherche + sélecteur de matières + rédaction auto d'annonce.
- **Perfs mobile** : images optimisées (utils/image.js), preconnect Supabase.
- **Bug suppression annonce** corrigé + belle modale de confirmation.
- **Audit paiement** (2 agents 28/06) : cœur du modèle SAIN, correctifs C1/C2/C7/idempotence appliqués.

### Modèle tarifaire (FERME)
- **Main propre : protection 5% + 1,00€, port 0€** (option principale, gratuite, NOUT gagne 1,25–3,50€).
- **Chronopost relais : protection 5% + 3,49€, port affiché 6,49€** (jamais de perte).
- **Chronopost domicile : protection 5% + 3,49€, port ~8,90€**.
- Règle d'or : **ZÉRO perte sur chaque colis** (NOUT n'a pas de trésorerie). Source de vérité : `src/utils/shipping.js` + `netlify/functions/create-checkout-session.js` (recalcule côté serveur).
- Argument marketing #1 : sur NOUT le vendeur garde 100% de son prix (frais ajoutés à l'acheteur), chez Kazakaz le vendeur perd 15%.

---

## 5. CE QUI RESTE À FAIRE (par priorité)

### 1) ✅ Accessibilité bureau — FAIT (commit 0fecb88, déjà poussé)
Barre de recherche du hero (Home.jsx) : select ville avec `aria-label` + texte assombri, bouton Rechercher en `#007A6E` (contraste OK). **Terminé.**

### 2) 🔌 Intégration API UBN (transporteur 974) — EN ATTENTE de la clé
- UBN a donné l'accès API (on installe nous-mêmes, on évite les 200€/mois).
- **AJOUTER UBN à côté de Chronopost** (ne pas remplacer).
- **Préparer le code d'abord** (prêt à brancher), activer quand la clé arrive. Aucun impact tant que `process.env.UBN_*` est vide.
- ⚠️ La clé/URL HUB/id client arrivent SÉPARÉMENT (pas dans la doc générique). Message envoyé à UBN, réponse attendue ~29/06.
- Guide complet : `nout/INTEGRATION-UBN.md`. 5 services UBN : relais 4€, économique 6€, express 10€, express premium 14€, samedi 18€.
- ⚠️ SÉCU : la clé UBN ne doit JAMAIS être côté navigateur. Toujours un proxy Netlify Function. Signer les POST en HMAC_SHA256.
- À coder : functions `ubn-points-relais`, `ubn-create-shipment`, `ubn-bordereau` + migration orders (ubn_ref_commande, ubn_tracking_*) + sélecteur point relais au checkout.

### 3) 🔍 SEO — À FAIRE À LA TOUTE FIN (priorité MAJEURE — me le rappeler)
Quand tout le reste est fini. Amandine y tient énormément. **Refaire des recherches web à jour** (bonnes pratiques Google du moment) avant de coder. À couvrir : sitemap.xml, robots.txt (existe déjà), Google Search Console, meta tags dynamiques par page, Open Graph/Twitter cards, données structurées Schema.org (Product/Offer), **problème SPA React** (contenu en JS → prévoir prerendering/SSR Netlify), Core Web Vitals, Bing Webmaster, backlinks/annuaires 974.

### Autres chantiers en attente (non prioritaires)
- Annulation/remboursement MANUEL côté admin (SAV litige) — manque actuel, non bloquant.
- Webhook : écouter `charge.dispute.created` + `charge.refunded` + `transfer.failed` + `account.updated` (angle mort litige après paiement).
- File de reprise des virements `payout_pending`.
- Comptes professionnels / Boutiques (gros sujet juridique : SIRET, TVA, CGV B2C, rétractation 14j) — à cadrer avec juriste.
- Système de LOT (bundle multi-articles même vendeur, port partagé).
- Fiche produit 2 colonnes (galerie sticky), photos réordonnables.
- Accessibilité : label select ville (Search.jsx aussi ?), cache images Supabase (Storage > Cache-Control, côté Supabase).
- Audit paiement RÉGULIER (relancer un agent souvent — Amandine y tient).

---

## 6. ⚠️ MIGRATIONS SQL À VÉRIFIER / PASSER dans Supabase

À demander à Amandine lesquelles sont passées. Fichiers dans `nout/supabase/migrations/` :
- `20260622_add_brand_to_listings.sql` — colonne brand (probablement OK)
- `20260627_follows.sql` — ✅ PASSÉE (table follows)
- `20260628_fix_delete_listing.sql` — FK orders ON DELETE SET NULL + listing_title. ⚠️ À CONFIRMER passée.
- `20260628_createur_pei.sql` — flag is_creator. ⚠️ À CONFIRMER passée.
- `20260628_paiement_securite.sql` — statut 'refunded' + index unique anti-double-commande + table processed_webhook_events. ⚠️ PARTIELLEMENT passée (refunded + table OK, **index KO**).
- Sous-catégories + ubn_shipping (à venir) — à vérifier.

⚠️ **Index anti-double-commande PAS encore passé** (doublons en test). 2 requêtes prêtes : (1) UPDATE pending doublon → cancelled, (2) CREATE UNIQUE INDEX uniq_listing_active_order. Non bloquant.

---

## 7. RÈGLES TECHNIQUES À NE PAS OUBLIER

- ⚠️⚠️ **NE JAMAIS retirer `stripe` et `web-push` de package.json** (requis côté serveur par les Netlify Functions — sinon le build Netlify échoue).
- **Contraste** : utiliser `bg-[#007A6E]` (vert foncé) pour les CTA/badges, PAS `bg-nout-turquoise` (#00C4B4 trop clair, échoue WCAG). Le turquoise reste pour les accents décoratifs.
- **Auth** : un trigger Supabase crée le profil auto — ne JAMAIS faire d'INSERT manuel dans `profiles`.
- **Admin** : passer `role = 'admin'` dans `profiles` via le dashboard Supabase.
- **Catégories** : 7 uniquement (vetements-femme/homme/enfant, chaussures, accessoires, sacs, beaute).
- **Notif push / paiement** : marchent en PROD seulement (Netlify Functions absentes en local).
- **Branche git** : master → GitHub → Netlify déploie auto. package-lock.json est gitignored (Netlify génère le sien).

### Palette officielle
| Variable | Valeur | Usage |
|---|---|---|
| nout-nuit | #0A0F2C | Fond hero, footer |
| nout-roi | #1A3A8F | Bleu roi, prix |
| nout-turquoise | #00C4B4 | Accent décoratif, hover |
| nout-texte | #1A1A2E | Texte principal |
| nout-muted | #6B7A99 | Texte secondaire |
| #007A6E | — | CTA / badges (bon contraste) |

---

## 8. CONTEXTE BUSINESS UTILE

- **Concurrent principal 974 : Kazakaz** (~328 users, 453 annonces, croissance lente). Frais 15% PRÉLEVÉS SUR LE VENDEUR (inverse de NOUT). Livraison via UBN (4€ relais) car ils ont le volume + abonnements.
- **UBN = 200€/mois fixe + ~4€/colis.** Rentable vs Chronopost à partir de ~45 colis/mois. Au lancement on reste **Chronopost à l'acte** (0€ fixe). Bascule UBN quand ~45-50 colis/mois.
- **Sociétés du porteur (Dawson BOYER)** : Oracle Production (audiovisuel/motion design) + Presty (plateforme de mise en valeur des services d'entreprises). Leviers B2B.
- Réseaux : Instagram @nout_reunion, TikTok @NOUTre.
- ACRE URSSAF : deadline ~31 juillet 2026. INPI : dépôt marque NOUT (~270€).

---

*Fichier généré le 28 juin 2026. La source de vérité de travail reste la mémoire Claude locale + le dossier `nout/SUIVI-SESSIONS/`. Ce fichier en est un instantané complet pour reprise sur autre machine.*
