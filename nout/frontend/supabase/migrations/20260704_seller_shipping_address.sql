-- ================================================================
-- NOUT — Adresse d'expédition du VENDEUR sur profiles (4 juillet 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente (rejouable sans erreur).
--
-- OBJECTIF : permettre de mettre le VENDEUR comme expéditeur sur les étiquettes
-- transporteur (UBN + Chronopost). Le profil n'avait que city + phone → il manquait
-- la rue et le code postal. On les ajoute ici.
--
-- ⚠️ NE PAS CONFONDRE avec l'adresse de LIVRAISON de l'acheteur, qui vit sur la
--    commande (orders.shipping_address / shipping_city / shipping_postcode), gérée au
--    checkout. Ici c'est l'adresse d'EXPÉDITION du vendeur, sur SON profil.
--
-- ⚠️ SÉCURITÉ / RGPD : ces champs sont des DONNÉES PERSONNELLES. Conformément à la
--    migration 20260629_fix_profiles_leak.sql, ils NE doivent PAS être lisibles
--    publiquement. On ne les ajoute donc PAS aux GRANT SELECT publics ; ils ne sont
--    lus que par leur propriétaire (get_my_account) et le serveur (service key).
-- ================================================================

-- 1) Colonnes adresse d'expédition vendeur.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ship_address  TEXT,   -- rue (n° + voie)
  ADD COLUMN IF NOT EXISTS ship_address2 TEXT,   -- complément (bât, étage…) — optionnel
  ADD COLUMN IF NOT EXISTS ship_postcode TEXT,   -- code postal 974xx
  ADD COLUMN IF NOT EXISTS ship_city     TEXT;   -- ville (peut reprendre profiles.city)

-- 2) Le propriétaire lit SES champs sensibles, adresse d'expédition incluse
--    (pour pré-remplir le formulaire Réglages). On étend get_my_account().
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

-- NB : l'écriture (UPDATE de son propre profil) est déjà couverte par la RLS
-- existante "profiles UPDATE USING (id = auth.uid())". Rien à changer côté écriture.
