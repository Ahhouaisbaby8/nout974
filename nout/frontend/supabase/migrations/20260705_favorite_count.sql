-- ================================================================
-- NOUT — Compteur de likes en direct sur les annonces (5 juillet 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente — AUCUN risque.
--
-- Ajoute listings.favorite_count (nombre de likes/favoris), maintenu automatiquement
-- par un trigger à chaque ajout/retrait de favori. La page annonce lit cette colonne
-- (compteur + badge « En demande » au-delà d'un seuil) et écoute la ligne en Realtime
-- pour l'afficher EN DIRECT quand un autre membre like.
--
-- ⚠️ APRÈS avoir exécuté ce script : activer la réplication Realtime sur la table `listings`
--    (Supabase Dashboard > Database > Replication > publication supabase_realtime > cocher `listings`).
--    Sans ça, le compteur s'affiche au chargement mais ne bouge pas « en direct ».
-- ================================================================

-- 1) Colonne dénormalisée (0 par défaut).
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS favorite_count integer NOT NULL DEFAULT 0;

-- 2) Recalage initial : compte les favoris déjà existants.
UPDATE public.listings l
SET favorite_count = COALESCE(f.n, 0)
FROM (
  SELECT listing_id, COUNT(*)::int AS n
  FROM public.favorites
  GROUP BY listing_id
) f
WHERE f.listing_id = l.id;

-- (remet à 0 les annonces sans aucun favori, au cas où une valeur périmée traînerait)
UPDATE public.listings l
SET favorite_count = 0
WHERE NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.listing_id = l.id)
  AND l.favorite_count <> 0;

-- 3) Trigger : +1 à l'ajout d'un favori, -1 au retrait (jamais en-dessous de 0).
CREATE OR REPLACE FUNCTION public.sync_favorite_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.listings
      SET favorite_count = favorite_count + 1
      WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.listings
      SET favorite_count = GREATEST(0, favorite_count - 1)
      WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_favorite_count ON public.favorites;
CREATE TRIGGER trg_sync_favorite_count
  AFTER INSERT OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.sync_favorite_count();
