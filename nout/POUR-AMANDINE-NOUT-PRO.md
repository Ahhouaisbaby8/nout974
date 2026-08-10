# NOUT Pro — ce qu'il faut faire côté base

Tout le code est poussé sur `master` (HEAD `a1102d5`) et déployé. **Rien ne fonctionne
tant que la migration ci-dessous n'est pas exécutée** : aujourd'hui la table des
boutiques n'existe pas, donc le site affiche des messages honnêtes au lieu de planter,
mais aucune boutique ne s'enregistre.

Le déploiement Netlify **n'exécute aucune migration** (vérifié : le build ne fait que
`npm run build`). C'est donc à faire à la main.

---

## 1. Exécuter la migration — 5 minutes

Dans Supabase → **SQL Editor** → **New query** → colle **tout le bloc ci-dessous** → **Run**.

(C'est aussi le fichier `nout/frontend/supabase/migrations/20260806_shops.sql` du repo,
si tu préfères l'ouvrir de là — c'est exactement le même contenu.)

```sql
-- ─── NOUT Pro : entité BOUTIQUE (shops) + rattachement des produits ──────────────
-- MVP NOUT Pro. Une "boutique" = un vendeur pro avec une marque (slug, logo, couleurs,
-- police) et un catalogue de produits. 1 boutique = 1 profil (owner_id unique).
--
-- Un produit de boutique = un `listings` existant avec `shop_id` renseigné : il passe
-- par le MÊME tunnel escrow (create-checkout-session). AUCUN changement paiement ici.
--
-- Idempotent (rejouable sans erreur). Aucune donnée sensible (pas d'email/iban) : la
-- boutique est une vitrine publique.
-- ⚠️ Slugs RÉSERVÉS (annonce, recherche, c, profil, createurs, commander, compte,
--    espace-vendeur, admin, publier, messages, favoris, notifications, …) : à bloquer
--    À LA CRÉATION côté application (route attrape-tout `nout.re/:slug`), pas en SQL.

-- 1) TABLE shops ------------------------------------------------------------------
create table if not exists public.shops (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  slug          text not null,                          -- URL : nout.re/<slug>
  name          text not null,                          -- nom commercial / marque
  tagline       text,                                   -- slogan
  description   text,
  logo_url      text,                                   -- chemin bucket "shops"
  banner_url    text,
  accent_color  text,                                   -- hex de marque, ex '#0E8C82'
  font_key      text not null default 'sans',           -- police preset (sans/serif/display)
  template_key  text not null default 'classic',        -- gabarit de boutique
  sector        text,                                   -- univers (Mode, Maison, …) : images + rayons conseillés
  mode          text not null default 'escrow',         -- escrow (vend en ligne) | contact (devis) | bio (page de liens)
  -- Présentation libre produite par l'éditeur « Personnaliser » : textes réécrits,
  -- ordre des sections, mise en page d'accueil, visuels choisis, rayons, liens, couleur
  -- secondaire, fond. En JSON parce que l'éditeur bouge vite : une colonne par réglage
  -- imposerait une migration à chaque nouveau champ, pour des données jamais requêtées.
  settings      jsonb not null default '{}'::jsonb,
  -- Immatriculation : exigée pour PUBLIER, pas pour créer (voir contrainte plus bas).
  siret         text,
  published_at  timestamptz,
  is_active     boolean not null default false,         -- brouillon tant que non publiée
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Slug unique global (insensible à la casse)
create unique index if not exists shops_slug_unique  on public.shops(lower(slug));
create index if not exists shops_owner_idx on public.shops(owner_id);

-- QUOTA DE BOUTIQUES : 2 par personne, davantage sur demande au support -------------
-- Un compte pourrait sinon fabriquer des dizaines de vitrines pour occuper le terrain
-- (adresses accaparées, catalogue pollué, réputation). Le quota est stocké PAR PROFIL
-- pour que le support puisse l'augmenter au cas par cas sans toucher au code, et il est
-- appliqué par un TRIGGER : une garde côté écran serait contournable en appelant l'API.
alter table public.profiles add column if not exists shop_quota smallint not null default 2;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_shop_quota_sane') then
    alter table public.profiles
      add constraint profiles_shop_quota_sane check (shop_quota between 0 and 50);
  end if;
end $$;

create or replace function public.check_shop_quota()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  quota int;
  used  int;
begin
  select coalesce(p.shop_quota, 2) into quota from public.profiles p where p.id = new.owner_id;
  select count(*) into used from public.shops s where s.owner_id = new.owner_id;
  if used >= coalesce(quota, 2) then
    raise exception 'SHOP_QUOTA_REACHED: % boutique(s) maximum pour ce compte', coalesce(quota, 2)
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_check_shop_quota on public.shops;
create trigger trg_check_shop_quota
  before insert on public.shops
  for each row execute function public.check_shop_quota();

-- Format du slug : minuscules/chiffres/tirets, 3–40 caractères, bornes alphanumériques
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shops_slug_format') then
    alter table public.shops
      add constraint shops_slug_format
      check (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$');
  end if;
end $$;

-- Modes autorisés (le front n'est pas la source de vérité)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shops_mode_valid') then
    alter table public.shops
      add constraint shops_mode_valid check (mode in ('escrow', 'contact', 'bio'));
  end if;
end $$;

-- SIRET : 14 chiffres, et OBLIGATOIRE pour publier.
-- La règle vit ici et pas seulement dans l'écran de publication : une boutique
-- publiée sans immatriculation nous exposerait, quelle que soit la porte utilisée.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shops_siret_format') then
    alter table public.shops
      add constraint shops_siret_format check (siret is null or siret ~ '^[0-9]{14}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shops_active_needs_siret') then
    alter table public.shops
      add constraint shops_active_needs_siret check (is_active = false or siret is not null);
  end if;
end $$;

-- 2) updated_at automatique -------------------------------------------------------
create or replace function public.set_shops_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  -- date de première publication, posée par la base : le front ne peut pas l'antidater
  if new.is_active and (tg_op = 'INSERT' or not coalesce(old.is_active, false)) then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

drop trigger if exists trg_shops_updated_at on public.shops;
create trigger trg_shops_updated_at
  before insert or update on public.shops
  for each row execute function public.set_shops_updated_at();

-- 3) RLS shops : lecture publique des boutiques actives, écriture = propriétaire ----
alter table public.shops enable row level security;

drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops
  for select using (is_active = true or owner_id = auth.uid());

drop policy if exists shops_insert on public.shops;
create policy shops_insert on public.shops
  for insert with check (owner_id = auth.uid());

drop policy if exists shops_update on public.shops;
create policy shops_update on public.shops
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists shops_delete on public.shops;
create policy shops_delete on public.shops
  for delete using (owner_id = auth.uid());

-- Lecture publique assumée, y compris `siret` : l'immatriculation d'un professionnel
-- est une mention obligatoire de son site (elle s'affiche dans ses mentions légales).
-- Aucune donnée personnelle sensible ne vit dans cette table.
grant select on public.shops to anon, authenticated;
grant insert, update, delete on public.shops to authenticated;

-- 4) listings.shop_id : rattache un produit à une boutique (null = annonce classique)
alter table public.listings add column if not exists shop_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_shop_id_fkey') then
    alter table public.listings
      add constraint listings_shop_id_fkey
      foreign key (shop_id) references public.shops(id) on delete set null;
  end if;
end $$;

create index if not exists listings_shop_id_idx on public.listings(shop_id);

-- Rayon PROPRE À LA BOUTIQUE (« Vannerie péi », « Coffrets »…). Distinct de la
-- catégorie du marketplace, qui reste celle du catalogue NOUT : un produit est rangé
-- dans le rayon de son vendeur ET dans une catégorie NOUT. Null pour une annonce C2C.
alter table public.listings add column if not exists shop_rayon text;

-- L'état (`condition`) n'est PAS dupliqué : le vocabulaire existant du marketplace
-- (neuf_avec_etiquette, neuf_sans_etiquette, tres_bon_etat, bon_etat, etat_correct)
-- suffit, et la distinction légale neuf/occasion s'en déduit (préfixe « neuf »).

-- 5) Intégrité : un produit ne peut être rattaché qu'à SA PROPRE boutique -----------
--    (empêche d'accrocher son annonce à la boutique d'un autre vendeur).
create or replace function public.check_listing_shop_owner()
returns trigger language plpgsql as $$
begin
  if new.shop_id is not null then
    if not exists (
      select 1 from public.shops s
      where s.id = new.shop_id and s.owner_id = new.user_id
    ) then
      raise exception 'shop_id % nappartient pas au vendeur %', new.shop_id, new.user_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_check_listing_shop_owner on public.listings;
create trigger trg_check_listing_shop_owner
  before insert or update of shop_id, user_id on public.listings
  for each row execute function public.check_listing_shop_owner();
```

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
