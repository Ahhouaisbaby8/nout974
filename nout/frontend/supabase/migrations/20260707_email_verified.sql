-- ================================================================
-- NOUT — VALIDATION E-MAIL DIFFÉRÉE (7 juillet 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente (rejouable).
--
-- ⚠️ ORDRE D'EXÉCUTION (important) :
--   1. Le code frontend correspondant doit être DÉPLOYÉ (fait).
--   2. Exécuter CE script.
--   3. IMMÉDIATEMENT APRÈS : Dashboard Supabase > Authentication >
--      Sign In / Providers > Email > DÉSACTIVER « Confirm email ».
--   → Les nouveaux inscrits entrent alors DIRECTEMENT sur le site ; la
--     vérification e-mail (faite par NOUT, plus par Supabase) n'est exigée
--     qu'au moment d'AGIR : publier une annonce, écrire un message, faire
--     une offre, acheter. Naviguer / chercher / mettre en favori = libre.
--
-- POURQUOI PAS le réglage Supabase seul : une fois « Confirm email »
-- désactivé, Supabase marque tout le monde confirmé d'office → le signal
-- disparaît. On porte donc notre propre vérification : colonne
-- profiles.email_verified_at + e-mail de vérification envoyé par NOUT
-- (fonctions send-verify-email / verify-email) + barrières SQL ci-dessous.
-- Les comptes Google sont considérés vérifiés d'office (Google fait foi).
-- ================================================================

-- ── 1) Colonnes ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at    timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verify_token   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verify_expires timestamptz;
-- NB : grâce aux GRANT par colonne posés le 29 juin (fix fuite profiles),
-- ces nouvelles colonnes ne sont PAS lisibles par anon/authenticated —
-- le token de vérification n'est donc jamais exposé au client. Le statut
-- email_verified_at est exposé au propriétaire via get_my_account (ci-dessous).

-- ── 2) Backfill : tous les comptes EXISTANTS sont vérifiés ────────────────
-- (ils ont tous dû confirmer leur e-mail sous l'ancien réglage, ou viennent
-- de Google). Seuls les inscrits APRÈS la bascule partiront non vérifiés.
UPDATE public.profiles SET email_verified_at = now() WHERE email_verified_at IS NULL;

-- ── 3) get_my_account : + email_verified_at ────────────────────────────────
-- ⚠️ DROP obligatoire (le type de retour change). On REPREND À L'IDENTIQUE la version du
-- 4 juillet (20260704_seller_shipping_address) — 8 colonnes DONT les ship_* — et on AJOUTE
-- email_verified_at. NE PAS oublier les ship_* : sinon Settings verrait l'adresse d'expédition
-- vendeur vide et l'écraserait à null au 1er enregistrement (perte de données + étiquettes KO).
DROP FUNCTION IF EXISTS public.get_my_account();
CREATE FUNCTION public.get_my_account()
RETURNS TABLE (
  email text, phone text, iban text, stripe_account_id text,
  ship_address text, ship_address2 text, ship_postcode text, ship_city text,
  email_verified_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email, phone, iban, stripe_account_id,
         ship_address, ship_address2, ship_postcode, ship_city,
         email_verified_at
  FROM public.profiles
  WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_account() TO authenticated;

-- ── 4) L'appelant courant est-il vérifié ? ─────────────────────────────────
-- Google (provider dans le JWT) = vérifié d'office ; sinon on lit la colonne.
CREATE OR REPLACE FUNCTION private.caller_email_verified()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  jwt_claims TEXT := nullif(current_setting('request.jwt.claims', true), '');
  app_meta   jsonb;
BEGIN
  IF jwt_claims IS NOT NULL THEN
    app_meta := jwt_claims::jsonb->'app_metadata';
    -- Google fait foi : soit provider scalaire = 'google', soit présent dans providers[] (compte
    -- e-mail ayant lié Google). Aligné sur isEmailVerified (front) et create-checkout-session (serveur)
    -- pour ne pas créer de cul-de-sac (front qui croit vérifié, trigger qui bloque).
    IF (app_meta->>'provider') = 'google'
       OR (jsonb_typeof(app_meta->'providers') = 'array' AND app_meta->'providers' ? 'google') THEN
      RETURN true;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND email_verified_at IS NOT NULL
  );
END;
$$;

-- ── 5) Barrière commune : e-mail vérifié requis pour AGIR ─────────────────
-- Appels client uniquement ; service_role (webhook, fonctions Netlify) et
-- SQL direct passent toujours.
CREATE OR REPLACE FUNCTION public.require_verified_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  jwt_claims TEXT;
  jwt_role   TEXT;
BEGIN
  jwt_claims := nullif(current_setting('request.jwt.claims', true), '');
  jwt_role   := CASE WHEN jwt_claims IS NOT NULL
                     THEN jwt_claims::jsonb->>'role'
                     ELSE NULL
                END;
  IF jwt_role IS NULL OR jwt_role NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NOT private.caller_email_verified() THEN
    -- Marqueur stable : l'app le détecte et affiche le bandeau « Vérifie ton e-mail ».
    RAISE EXCEPTION 'NOUT_UNVERIFIED_EMAIL';
  END IF;
  RETURN NEW;
END;
$$;

-- Publier une annonce
DROP TRIGGER IF EXISTS trg_require_verified_email_listings ON public.listings;
CREATE TRIGGER trg_require_verified_email_listings
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email();

-- Écrire un message
DROP TRIGGER IF EXISTS trg_require_verified_email_messages ON public.messages;
CREATE TRIGGER trg_require_verified_email_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email();

-- Faire une offre
DROP TRIGGER IF EXISTS trg_require_verified_email_offers ON public.offers;
CREATE TRIGGER trg_require_verified_email_offers
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email();

-- L'ACHAT est gardé côté serveur dans create-checkout-session.js (403
-- email_unverified) — pas de trigger ici : la commande est créée par la
-- fonction Netlify en service_role.
