-- ================================================================
-- NOUT — Offres / contre-offres structurées (29 juin 2026)
--
-- Remplace l'ancien « offre = simple message texte » par une vraie
-- offre suivie (montant + statut). L'acheteur propose un prix ; le
-- vendeur accepte / refuse / fait une contre-offre. Une offre ACCEPTÉE
-- permet à l'acheteur de payer AU PRIX CONVENU (validé côté serveur dans
-- create-checkout-session via offer_id — le client ne fixe jamais le prix).
--
-- ⚠️ À exécuter dans Supabase > SQL Editor. Idempotente (rejouable).
-- ================================================================

CREATE TABLE IF NOT EXISTS public.offers (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  uuid NOT NULL REFERENCES public.listings(id)  ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE, -- auteur de CETTE offre (acheteur, ou vendeur si contre-offre)
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','refused','countered','cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offers_listing_idx ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS offers_buyer_idx   ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS offers_seller_idx  ON public.offers(seller_id);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Lecture : uniquement les deux parties de l'offre.
DROP POLICY IF EXISTS offers_select ON public.offers;
CREATE POLICY offers_select ON public.offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Création : l'auteur (proposed_by) doit être l'utilisateur courant ET partie de l'offre.
DROP POLICY IF EXISTS offers_insert ON public.offers;
CREATE POLICY offers_insert ON public.offers FOR INSERT
  WITH CHECK (
    auth.uid() = proposed_by
    AND (auth.uid() = buyer_id OR auth.uid() = seller_id)
  );

-- Pas de policy UPDATE pour les rôles publics : les transitions de statut
-- (accepter / refuser / contre-offre) passent EXCLUSIVEMENT par la fonction
-- serveur respond-offer (service key), qui valide qui a le droit de répondre.
GRANT SELECT, INSERT ON public.offers TO authenticated;
