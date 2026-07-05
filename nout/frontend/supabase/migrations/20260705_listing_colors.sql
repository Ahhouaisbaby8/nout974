-- ============================================================
-- Annonces : couleurs multiples (jusqu'à 2), façon Vinted.
-- ------------------------------------------------------------
-- Nouvelle colonne `colors` (tableau). La colonne `color` (TEXT, couleur PRINCIPALE) reste
-- remplie côté app (= colors[0]) → le filtre de recherche (.eq('color', ...)) et tout le code
-- existant continuent de marcher sans changement : AUCUNE régression.
-- Idempotent : rejouable sans effet.
-- ============================================================
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Backfill : les annonces existantes (une seule couleur dans `color`) → colors = [color].
UPDATE public.listings
  SET colors = ARRAY[color]
  WHERE color IS NOT NULL AND color <> '' AND (colors IS NULL OR cardinality(colors) = 0);
