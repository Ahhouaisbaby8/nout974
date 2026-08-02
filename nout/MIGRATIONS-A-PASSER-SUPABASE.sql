-- ================================================================
-- NOUT — Migrations à passer dans Supabase (SQL Editor)
-- Regroupe les migrations récentes. TOUTES idempotentes = rejouables
-- sans risque, même si certaines sont déjà passées.
-- Créé le 06/07/2026. Colle TOUT ce bloc d'un coup, puis "Run".
-- ================================================================


-- ─── 1) CONTRAINTE STATUT orders : liste COMPLÈTE (avec 'delivered' + 'chargeback') ───
-- ⚠️ CRITIQUE : sans 'delivered', aucune commande livrée n'est versée au vendeur.
-- On retrouve la contrainte quel que soit son nom, on la supprime, on recrée la bonne.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'paid', 'shipped', 'delivered', 'disputed',
    'completed', 'payout_pending', 'refunded', 'cancelled', 'chargeback'
  ));


-- ─── 2) orders : port figé + colonnes Chronopost ───
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee numeric;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS chronopost_tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS chronopost_label_url       TEXT,
  ADD COLUMN IF NOT EXISTS chronopost_status          TEXT;


-- ─── 3) profiles : adresse d'expédition VENDEUR (+ get_my_account étendu) ───
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ship_address  TEXT,
  ADD COLUMN IF NOT EXISTS ship_address2 TEXT,
  ADD COLUMN IF NOT EXISTS ship_postcode TEXT,
  ADD COLUMN IF NOT EXISTS ship_city     TEXT;

CREATE OR REPLACE FUNCTION public.get_my_account()
RETURNS TABLE (
  email text, phone text, iban text, stripe_account_id text,
  ship_address text, ship_address2 text, ship_postcode text, ship_city text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email, phone, iban, stripe_account_id,
         ship_address, ship_address2, ship_postcode, ship_city
  FROM public.profiles
  WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_account() TO authenticated;


-- ─── 4) listings : couleurs multiples + compteur de likes ───
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

UPDATE public.listings
  SET colors = ARRAY[color]
  WHERE color IS NOT NULL AND color <> '' AND (colors IS NULL OR cardinality(colors) = 0);

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS favorite_count integer NOT NULL DEFAULT 0;

UPDATE public.listings l
SET favorite_count = COALESCE(f.n, 0)
FROM (
  SELECT listing_id, COUNT(*)::int AS n
  FROM public.favorites
  GROUP BY listing_id
) f
WHERE f.listing_id = l.id;

UPDATE public.listings l
SET favorite_count = 0
WHERE NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.listing_id = l.id)
  AND l.favorite_count <> 0;

CREATE OR REPLACE FUNCTION public.sync_favorite_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.listings SET favorite_count = favorite_count + 1 WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.listings SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_favorite_count ON public.favorites;
CREATE TRIGGER trg_sync_favorite_count
  AFTER INSERT OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.sync_favorite_count();


-- ─── 5) messages : colonne type (carte système vs message texte) ───
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';


-- ─── 6) SÉCURITÉ CRITIQUE : verrou orders / profiles (anti-vol solde + anti-escalade admin) ───
REVOKE UPDATE ON public.orders FROM anon, authenticated;

CREATE OR REPLACE FUNCTION protect_sensitive_profile_fields()
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
  IF jwt_role IN ('anon', 'authenticated') THEN
    NEW.role              := OLD.role;
    NEW.is_verified       := OLD.is_verified;
    NEW.is_banned         := OLD.is_banned;
    NEW.banned_at         := OLD.banned_at;
    NEW.is_suspended      := OLD.is_suspended;
    NEW.suspended_until   := OLD.suspended_until;
    NEW.stripe_account_id := OLD.stripe_account_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_sensitive_profile_fields();

-- ================================================================
-- FIN. Après le "Run" (tout en Success) :
--  • Database > Replication > publication supabase_realtime > cocher `listings`
--    (pour que le compteur de likes bouge EN DIRECT).
-- ================================================================
