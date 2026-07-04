-- ================================================================
-- NOUT — Migration SÉCURITÉ : fuite de données sur la table profiles
-- (29 juin 2026)
--
-- AVANT : la policy "profiles FOR SELECT USING (true)" + les grants par
-- défaut rendaient TOUTES les colonnes de profiles lisibles publiquement,
-- y compris email / phone / iban / stripe_account_id de TOUS les
-- utilisateurs (aspirable via l'API publique en anonyme). Violation RGPD.
--
-- APRÈS : seules les colonnes d'AFFICHAGE restent publiques. Les champs
-- sensibles ne sont accessibles que :
--   - à leur propriétaire        → fonction get_my_account()
--   - à un admin/modérateur       → fonction admin_accounts()
--
-- ⚠️ À exécuter dans Supabase > SQL Editor APRÈS le déploiement du
-- frontend correspondant. Idempotente (rejouable sans erreur).
-- ================================================================

-- 1) Restreindre les colonnes lisibles par les rôles publics (anon + authenticated).
--    On retire l'accès "toutes colonnes" puis on ré-accorde uniquement les colonnes
--    d'affichage. email / phone / iban / stripe_account_id ne sont plus jamais
--    sélectionnables par ces rôles (donc plus aspirables via l'API).
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, username, avatar_url, bio, city, role,
  is_verified, is_banned, is_founder, founder_number, show_founder_badge,
  is_creator, creator_craft, created_at, updated_at
) ON public.profiles TO anon, authenticated;

-- 2) Le propriétaire lit SES propres champs sensibles (Réglages, etc.).
CREATE OR REPLACE FUNCTION public.get_my_account()
RETURNS TABLE (email text, phone text, iban text, stripe_account_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email, phone, iban, stripe_account_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_account() TO authenticated;

-- 3) Un admin/modérateur lit les profils complets (back-office) — et UNIQUEMENT
--    s'il a bien ce rôle (vérifié dans la fonction). Les autres reçoivent 0 ligne.
CREATE OR REPLACE FUNCTION public.admin_accounts()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = auth.uid() AND me.role IN ('admin', 'moderator')
  )
$$;
REVOKE ALL ON FUNCTION public.admin_accounts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_accounts() TO authenticated;
