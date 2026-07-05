-- ================================================================
-- NOUT — VERROU SÉCURITÉ CRITIQUE : colonnes sensibles de orders / profiles
-- À exécuter dans Supabase > SQL Editor. Idempotente — AUCUN risque.
--
-- FAILLE CORRIGÉE (audit 5 juillet) : les policies UPDATE de `orders` et `profiles`
-- sont en `USING (...)` SANS `WITH CHECK` ni restriction de colonne. Avec les droits
-- Supabase par défaut (GRANT UPDATE à authenticated), un membre connecté peut, DEPUIS
-- SON NAVIGATEUR :
--   • orders   : supabase.from('orders').update({ seller_payout: 999999 }).eq('id', sonOrderId)
--                → confirm-escrow / release-delivered VIRENT ce montant (vol sur le solde Stripe LIVE) ;
--                idem total_price (sur-remboursement), status, tracking_number…
--   • profiles : supabase.from('profiles').update({ role: 'admin' }).eq('id', sonId)
--                → escalade admin (lecture de toutes les données perso, remboursements, bannissements…).
-- ================================================================

-- ── 1) orders : le client ne DOIT jamais modifier une commande directement ──
-- Toutes les transitions passent par les Netlify Functions en service_role (qui bypassent RLS).
-- Le front ne fait AUCUN orders.update (vérifié). On retire donc le privilège UPDATE au client.
REVOKE UPDATE ON public.orders FROM anon, authenticated;

-- ── 2) profiles : bloquer la modification des colonnes SENSIBLES par le client ──
-- Même mécanisme que protect_founder_fields (20260618) : on autorise service_role (Netlify) et le SQL
-- direct (migrations/admin), on remet à leur ancienne valeur toute tentative client sur ces colonnes.
-- Les colonnes légitimes (username, avatar_url, bio, phone, city, show_founder_badge, is_creator,
-- creator_craft, ship_*) restent librement modifiables.
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

  -- Appels client (anon / authenticated) : on fige les champs sensibles à leur ancienne valeur.
  -- service_role (Netlify Functions) et SQL direct (pas de claims) : autorisés.
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
