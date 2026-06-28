-- ================================================================
-- NOUT — Migration : sous-catégorie sur les annonces
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================
--
-- Chaque annonce appartient déjà à une catégorie (ex : "vetements-femme").
-- On ajoute une sous-catégorie optionnelle (ex : "femme-robes") pour affiner
-- la recherche via le menu déroulant (CategoryMenu) et les filtres.
--
-- Nullable : les annonces déjà publiées n'ont pas de sous-catégorie.
-- Le filtre "souple" côté recherche affiche, dans une sous-catégorie,
-- les annonces de cette sous-catégorie ET celles sans sous-catégorie
-- de la même catégorie parente → rien ne disparaît.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Index pour accélérer le filtrage par sous-catégorie
CREATE INDEX IF NOT EXISTS idx_listings_subcategory ON listings (subcategory);
