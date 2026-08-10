# NOUT Pro — ce qu'il faut faire côté base

Tout le code est poussé sur `master` (HEAD `a1102d5`) et déployé. **Rien ne fonctionne
tant que la migration ci-dessous n'est pas exécutée** : aujourd'hui la table des
boutiques n'existe pas, donc le site affiche des messages honnêtes au lieu de planter,
mais aucune boutique ne s'enregistre.

Le déploiement Netlify **n'exécute aucune migration** (vérifié : le build ne fait que
`npm run build`). C'est donc à faire à la main.

---

## 1. Exécuter la migration — 5 minutes

**Fichier :** `nout/frontend/supabase/migrations/20260806_shops.sql`

Dans Supabase → **SQL Editor** → coller tout le fichier → **Run**.

Elle est **rejouable sans risque** : tout est en `if not exists` / `create or replace`.
Si un doute, on peut la relancer.

Ce qu'elle crée :

- **table `shops`** — une boutique = une marque (nom, adresse `nout.re/<slug>`, logo,
  couleurs, police, thème) + une colonne `settings` en JSON qui porte toute la
  personnalisation (textes, blocs, images, palette, rayons).
- **`listings.shop_id`** — un produit de boutique est un `listings` normal rattaché à
  une boutique. **Aucun changement dans le paiement** : il passe par le même tunnel.
- **`listings.shop_rayon`** — le rayon du vendeur (« Vannerie péi »), distinct de la
  catégorie du marketplace.
- **`profiles.shop_quota`** (défaut **2**) — nombre de boutiques autorisées par compte.
- **les règles de sécurité** : lecture publique des boutiques publiées, écriture réservée
  au propriétaire, un produit ne peut être rattaché qu'à sa propre boutique.

### Deux règles portées par la base, pas par l'écran

C'est volontaire : une garde côté interface se contourne en appelant l'API directement.

- **Publier exige un SIRET.** `is_active` vaut `false` par défaut et une contrainte
  refuse toute boutique publiée sans numéro d'immatriculation.
- **Deux boutiques par compte maximum.** Un déclencheur refuse la troisième.
  Pour relever la limite de quelqu'un, une seule ligne à passer :

  ```sql
  update profiles set shop_quota = 5 where id = '<identifiant du membre>';
  ```

---

## 2. Vérifier que c'est passé — 2 minutes

Toujours dans le SQL Editor :

```sql
-- doit renvoyer une ligne
select count(*) from information_schema.tables
 where table_schema = 'public' and table_name = 'shops';

-- doit renvoyer 2
select column_name from information_schema.columns
 where table_name = 'listings' and column_name in ('shop_id', 'shop_rayon');

-- doit renvoyer 2
select column_default from information_schema.columns
 where table_name = 'profiles' and column_name = 'shop_quota';
```

Puis, sur le site : va sur **nout.re/espace-pro** en étant connectée.
Le message ambre « l'enregistrement des boutiques n'est pas encore activé » doit avoir
disparu et laisser place à « Tu n'as pas encore de boutique ».

---

## 3. Le test à faire ensemble, une fois la migration passée

Dans cet ordre, ça prend dix minutes :

1. **nout.re/boutique-creer** → créer une boutique (nom, univers, thème, une accroche).
2. **« Personnaliser »** → changer un texte, déplacer une photo, ajouter un bloc, changer
   la couleur de fond. Vérifier que l'aperçu suit et que **Annuler** (Ctrl+Z) revient bien
   en arrière.
3. **« Enregistrer le brouillon »** → doit dire « Boutique enregistrée en brouillon ».
4. **nout.re/espace-pro** → la boutique apparaît en « Brouillon », avec le compteur des
   ventes du mois au-dessus.
5. **« Modifier »** depuis l'Espace pro → le wizard doit rouvrir **cette** boutique, pas
   un brouillon vide.
6. **Publier** avec un SIRET valide (14 chiffres) → puis ouvrir **nout.re/<le-slug>** :
   la boutique doit s'afficher publiquement.
7. Essayer de publier avec un SIRET vide ou à 10 chiffres → doit être refusé.

Si une étape coince, note à quel endroit exactement et ce qui s'affiche : le code traduit
déjà les erreurs de base en messages lisibles, donc le message a du sens.

---

## 4. Ce qui reste APRÈS, et qui n'est pas de ton ressort

Pour information, pour que tu saches où on en est :

- **Les produits de la boutique ne s'enregistrent pas encore.** Seule la boutique est
  sauvegardée ; le catalogue créé dans le wizard reste local. C'est le prochain chantier
  côté code (créer les `listings` avec leur `shop_id` et envoyer les photos).
- **Le prix du palier « nom de domaine »** n'est pas tranché — la page tarifs affiche
  « prix annoncé à l'ouverture » exprès.
- **Le juriste** doit valider deux choses avant l'ouverture commerciale : les CGV pro,
  et surtout la **clause de compensation** — sans elle, retenir l'abonnement sur un
  versement au vendeur n'est pas permis.
- **Le mécanisme de facturation** (retenue sur versement → prélèvement → mise en pause)
  n'est pas codé.

---

## En cas de doute

Ne force rien. La migration ne touche à **aucune** table d'argent : ni commandes, ni
paiements, ni versements, ni Stripe. Elle ajoute une table et trois colonnes. Si quelque
chose ne se passe pas comme décrit, arrête-toi et envoie le message d'erreur tel quel.
