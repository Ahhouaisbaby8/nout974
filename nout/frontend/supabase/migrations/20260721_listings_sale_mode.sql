-- ================================================================
-- NOUT — Mode de vente des annonces : 'escrow' (paiement NOUT) vs 'contact' (mise en relation)
-- À exécuter dans Supabase > SQL Editor. Idempotente — AUCUN risque.
--
-- CONTEXTE : les VÉHICULES entiers ne passent PAS par le paiement NOUT (frais Stripe démesurés sur
-- gros montants, risque juridique d'intermédiaire de paiement régulé DSP2/ACPR, séquestre ingérable).
-- Comme Leboncoin/LaCentrale : annonce + « Contacter le vendeur », paiement/remise EN DIRECT hors NOUT.
--
-- `sale_mode` est la SOURCE DE VÉRITÉ, imposée par un TRIGGER dérivé de la CATÉGORIE (le client ne
-- peut pas la forger, même via un insert brut). create-checkout-session.js REFUSE tout checkout sur
-- une annonce sale_mode='contact' (et garde aussi sur la catégorie 'vehicules' par ceinture-bretelles).
-- ================================================================

-- 1) Colonne : NOT NULL DEFAULT 'escrow' → TOUT l'existant reste en paiement NOUT (zéro backfill).
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sale_mode text NOT NULL DEFAULT 'escrow';

-- 2) Contrainte de valeurs (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_sale_mode_check') THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_sale_mode_check CHECK (sale_mode IN ('escrow', 'contact'));
  END IF;
END $$;

-- 3) Trigger : la BASE impose sale_mode d'après la catégorie, à l'INSERT comme à l'UPDATE.
--    Véhicules entiers → 'contact' (mise en relation) ; tout le reste → 'escrow' (paiement NOUT).
--    Déterministe et NON contournable : un insert/update forgé avec un mauvais sale_mode est corrigé.
CREATE OR REPLACE FUNCTION public.set_listing_sale_mode()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Véhicule = catégorie racine 'vehicules', ou tout id véhicule 'vehic-*' (sous-cat / typo / casse).
  -- lower() → robuste à la casse. À garder cohérent avec create-checkout-session.js + isContactCategory().
  NEW.sale_mode := CASE
    WHEN lower(NEW.category) = 'vehicules'
      OR lower(NEW.category) LIKE 'vehic-%'
      OR lower(coalesce(NEW.subcategory, '')) LIKE 'vehic-%'
    THEN 'contact' ELSE 'escrow' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_listing_sale_mode ON public.listings;
CREATE TRIGGER trg_set_listing_sale_mode
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_listing_sale_mode();

-- 4) Backfill de sûreté : réaligne d'éventuelles annonces déjà en base (aucun véhicule à ce jour).
UPDATE public.listings
  SET sale_mode = CASE
    WHEN lower(category) = 'vehicules' OR lower(category) LIKE 'vehic-%' OR lower(coalesce(subcategory,'')) LIKE 'vehic-%'
    THEN 'contact' ELSE 'escrow' END
  WHERE sale_mode IS DISTINCT FROM (CASE
    WHEN lower(category) = 'vehicules' OR lower(category) LIKE 'vehic-%' OR lower(coalesce(subcategory,'')) LIKE 'vehic-%'
    THEN 'contact' ELSE 'escrow' END);
