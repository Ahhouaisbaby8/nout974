-- ================================================================
-- NOUT — Migration : Membres Fondateurs — sécurité anti-triche
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================

-- ── 1. Colonnes profiles ─────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_founder         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS founder_number     INTEGER,
  ADD COLUMN IF NOT EXISTS show_founder_badge BOOLEAN DEFAULT TRUE;

-- Contraintes (ignorées si déjà présentes)
DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_founder_number_unique UNIQUE (founder_number);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_founder_number_range
      CHECK (founder_number IS NULL OR (founder_number BETWEEN 1 AND 50));
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ── 2. Protection anti-triche ────────────────────────────────────
-- is_founder et founder_number ne peuvent être modifiés que par
-- service_role (nos Netlify Functions avec SUPABASE_SERVICE_KEY).
-- Un utilisateur authentifié qui tente de les modifier voit ses
-- changements silencieusement remis à leur ancienne valeur.
-- show_founder_badge reste librement modifiable (toggle Settings).
-- Appels directs depuis le SQL Editor (pas de JWT) : autorisés.

CREATE OR REPLACE FUNCTION protect_founder_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  jwt_claims TEXT;
  jwt_role   TEXT;
BEGIN
  jwt_claims := nullif(current_setting('request.jwt.claims', true), '');
  jwt_role   := CASE WHEN jwt_claims IS NOT NULL
                     THEN jwt_claims::jsonb->>'role'
                     ELSE NULL
                END;

  -- Bloquer les appels client (anon / authenticated)
  -- Autoriser : service_role (Netlify) et SQL direct (admin, migrations)
  IF jwt_role IN ('anon', 'authenticated') THEN
    NEW.is_founder     := OLD.is_founder;
    NEW.founder_number := OLD.founder_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_founder_fields ON profiles;
CREATE TRIGGER trg_protect_founder_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_founder_fields();

-- ── 3. Attribution atomique ──────────────────────────────────────
-- pg_advisory_xact_lock garantit qu'une seule attribution s'exécute
-- à la fois, même si 10 utilisateurs remplissent les conditions
-- au même moment (race condition impossible).

CREATE OR REPLACE FUNCTION assign_founder(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count         INTEGER;
  v_next_number   INTEGER;
  v_listings_ok   BOOLEAN;
  v_orders_ok     BOOLEAN;
  v_launch_date   TIMESTAMPTZ;
BEGIN
  -- Verrou exclusif : tout concurrent attend la fin de cette transaction
  PERFORM pg_advisory_xact_lock(hashtext('nout_founder_attribution'));

  -- Idempotent : déjà fondateur → rien à faire
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND is_founder = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Lire la date de lancement depuis la config (NULL = pas encore lancé)
  v_launch_date := nullif(current_setting('app.founder_launch_date', true), '')::TIMESTAMPTZ;

  -- Vérification 1 : compte créé après LAUNCH_DATE
  IF v_launch_date IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = p_user_id AND created_at >= v_launch_date
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Vérification 2 : au moins 5 annonces actives (postées après LAUNCH_DATE si définie)
  SELECT COUNT(*) >= 5 INTO v_listings_ok
  FROM listings
  WHERE user_id  = p_user_id
    AND is_active = TRUE
    AND is_sold   = FALSE
    AND (v_launch_date IS NULL OR created_at >= v_launch_date);

  IF NOT v_listings_ok THEN
    RETURN FALSE;
  END IF;

  -- Vérification 3 : au moins 1 transaction terminée (achat ou vente)
  SELECT COUNT(*) >= 1 INTO v_orders_ok
  FROM orders
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND status IN ('completed', 'payout_pending')
    AND (v_launch_date IS NULL OR created_at >= v_launch_date);

  IF NOT v_orders_ok THEN
    RETURN FALSE;
  END IF;

  -- Compter les fondateurs actuels (lu après le verrou = valeur exacte)
  SELECT COUNT(*) INTO v_count FROM profiles WHERE is_founder = TRUE;

  IF v_count >= 50 THEN
    RETURN FALSE;
  END IF;

  -- Prochain numéro disponible
  SELECT COALESCE(MAX(founder_number), 0) + 1 INTO v_next_number
  FROM profiles WHERE is_founder = TRUE;

  UPDATE profiles
  SET is_founder     = TRUE,
      founder_number = v_next_number
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- Restreindre assign_founder au service_role uniquement
-- (défense primaire : le REVOKE empêche tout appel depuis le navigateur)
REVOKE ALL   ON FUNCTION assign_founder(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_founder(UUID) TO service_role;

-- ── 4. Paramètre LAUNCH_DATE côté SQL ───────────────────────────
-- À exécuter au moment du lancement officiel (remplacer la date) :
--   ALTER DATABASE postgres SET app.founder_launch_date = '2026-09-01T00:00:00+04:00';
--   SELECT pg_reload_conf();
--
-- Laisser NULL (non défini) avant le lancement → filtre de date désactivé.
