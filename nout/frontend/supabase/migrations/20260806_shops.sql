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

-- 1 seule boutique par vendeur (MVP) + slug unique global (insensible à la casse)
create unique index if not exists shops_owner_unique on public.shops(owner_id);
create unique index if not exists shops_slug_unique  on public.shops(lower(slug));

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
