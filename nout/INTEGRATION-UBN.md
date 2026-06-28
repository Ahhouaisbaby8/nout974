# Intégration livraison UBN — Mode d'emploi

> **État :** le code est **prêt**. Il ne s'active QUE lorsque tu auras renseigné la clé
> API + l'URL du HUB dans Netlify (étape 1 ci-dessous). Tant que ce n'est pas fait,
> le site fonctionne normalement et l'option UBN reste masquée — **aucun risque**.

UBN est **ajouté à côté de Chronopost** (on ne remplace rien).

---

## ⚠️ Règle de sécurité absolue

La **clé API UBN ne doit JAMAIS** :
- être écrite dans le code,
- être collée dans un chat,
- être visible dans le navigateur.

Elle se met **uniquement** dans les variables d'environnement Netlify (un coffre-fort
côté serveur). C'est ce que la doc UBN exige aussi (« le navigateur ne doit jamais
appeler UBN avec une clé »).

---

## Étape 1 — Renseigner les accès dans Netlify

Va dans **Netlify → ton site NOUT → Site configuration → Environment variables**, et
ajoute ces variables (valeurs fournies par UBN) :

| Variable | Description | Obligatoire |
|----------|-------------|:----------:|
| `UBN_API_KEY` | La clé secrète fournie par UBN (X-UBN-API-KEY) | ✅ |
| `UBN_HUB_BASE` | L'URL de base du HUB UBN, ex : `https://hub.exemple-ubn.re` (sans `/` final) | ✅ |
| `UBN_PARTNER` | Le nom partenaire (X-UBN-Partner) | ✅ |
| `UBN_CUSTOMER` | Ton id client API (X-UBN-Customer) | ✅ |
| `UBN_API_CONNECT_ID` | `id_api_connect` (un nombre) | ✅ |
| `UBN_SOURCE_SITE` | `https://nout.re` (optionnel, déduit automatiquement sinon) | — |

**Adresse expéditeur** (ce qui s'imprime comme expéditeur sur le bordereau) :

| Variable | Exemple |
|----------|---------|
| `UBN_SHIPPER_COMPANY` | `NOUT` |
| `UBN_SHIPPER_NAME` | `NOUT` |
| `UBN_SHIPPER_CP` | `97490` |
| `UBN_SHIPPER_VILLE` | `Sainte-Clotilde` |
| `UBN_SHIPPER_ADDRESS` | `12 rue Exemple` |
| `UBN_SHIPPER_PHONE` | `0262XXXXXX` |
| `UBN_SHIPPER_EMAIL` | `contact@nout.re` |

Après avoir ajouté les variables, **redéploie le site** (Netlify → Deploys → Trigger deploy).

---

## Étape 2 — Passer la migration SQL

Dans **Supabase → SQL Editor**, exécute le fichier :
`nout/supabase/migrations/20260628_ubn_shipping.sql`

Il ajoute les colonnes UBN sur les commandes (référence, suivi, point relais, bordereau).

---

## Ce que le code fait déjà (côté serveur, sécurisé)

| Fonction Netlify | Rôle |
|------------------|------|
| `ubn-points-relais` | Liste les points relais UBN (pour le sélecteur au checkout) |
| `ubn-create-shipment` | Crée l'expédition après paiement (POST signé HMAC) et stocke le suivi |
| `ubn-bordereau` | Télécharge l'étiquette PDF (réservé au vendeur de la commande) |
| `_ubn-client` | Cœur partagé : authentification + signature, **garde la clé côté serveur** |

Les 5 modes UBN disponibles : Point relais (4€), Économique 48/72h (6€), Express (10€),
Express Premium (14€), Samedi Express (18€). *(prix indicatifs — le tarif réel vient du HUB)*

---

## Ce qu'il reste à brancher une fois la clé en place

- Afficher les modes UBN + le sélecteur de point relais sur la page **Commander** (checkout)
- Bouton **« Télécharger le bordereau »** côté vendeur dans la page Commandes
- Afficher le **numéro de suivi** à l'acheteur

> On fait cette partie « visible » quand tu as la clé, pour pouvoir tout tester en vrai.
