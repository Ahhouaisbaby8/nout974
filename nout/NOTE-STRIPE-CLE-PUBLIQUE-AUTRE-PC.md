# 🔑 NOTE — Clé publiable Stripe (parcours de paiement intégré)

_Créée le 05/07/2026. À traiter sur **le PC de Dawson** (l'autre PC)._

## ✅ Ce qui est DÉJÀ fait
- La variable **`VITE_STRIPE_PUBLIC_KEY`** (valeur `pk_live_…`, clé publiable) a été **ajoutée dans Netlify**
  (Site configuration → Environment variables), en **non-secret** (c'est une clé publique, normale à exposer).
- Elle est aussi déjà listée dans `netlify.toml` → `SECRETS_SCAN_OMIT_KEYS` (anti-faux-positif du scanner).

## ⚠️ Pourquoi elle ne « fait » encore rien
Le code **actuellement en ligne** paie par **redirection serveur** :
`Checkout.jsx` → `fetch('/.netlify/functions/create-checkout-session')` → `window.location.href = data.url`.
Ce parcours **ne lit AUCUNE clé publishable**. Le package `@stripe/stripe-js` n'est même pas installé.

La clé publiable ne servira **que** si on développe le **nouveau parcours de paiement intégré**
(formulaire Stripe dans la page, avec `loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)` + `@stripe/stripe-js`).

## 📋 À FAIRE sur le PC de Dawson (dans le bon ordre)
1. **Coder + pousser** le nouveau parcours de paiement (celui qui lit `import.meta.env.VITE_STRIPE_PUBLIC_KEY`).
   - Penser à installer le package front : `npm install @stripe/stripe-js`
2. Vérifier que le nom lu est **exactement** `VITE_STRIPE_PUBLIC_KEY` (préfixe `VITE_` obligatoire, sinon Vite ne l'expose pas).
3. **Redéployer** sur Netlify — se fait AUTOMATIQUEMENT au `git push` (les variables `VITE_` ne sont injectées dans le bundle qu'à un **nouveau build**).
4. **Tester un vrai paiement** de bout en bout (mode live).

## 🔒 Sécurité — rappel
- `pk_live_…` = **publique**, visible dans le navigateur : normal, aucun risque. NE PAS la marquer « secret ».
- `sk_live_…` (secrète) = **jamais** dans le front, reste côté serveur (déjà en place : `STRIPE_SECRET_KEY`).
- Sur CE PC, `.env.local` contient une clé **`pk_test_…`** (tests locaux uniquement, sans effet sur la prod).

---
_TL;DR : la clé publique est prête dans Netlify. Il ne reste qu'à écrire/pusher le parcours intégré sur le PC de Dawson, puis ça redéploie tout seul → tester._
