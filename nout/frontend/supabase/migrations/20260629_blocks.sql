-- ================================================================
-- NOUT — Bloquer un membre (29 juin 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente (rejouable).
-- PRÉREQUIS : tables profiles, messages, offers, follows, reviews existent
-- (offers via migration 20260629_offers.sql).
--
-- Création UNIDIRECTIONNELLE (A bloque B), effet BIDIRECTIONNEL via RLS : tant
-- qu'un blocage existe dans un sens, les deux ne peuvent plus s'écrire, se faire
-- d'offres, s'abonner ni se laisser d'avis — CÔTÉ SERVEUR, pas masqué en UI.
-- SILENCIEUX : le bloqué ne lit pas blocks, et la fonction d'arbitrage vit dans
-- un schéma `private` NON exposé par l'API (impossible à sonder en RPC).
-- ================================================================

-- ── 1. Table blocks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocks (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON public.blocks(blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Lecture : SEULEMENT le bloqueur voit ses propres blocages (silencieux).
DROP POLICY IF EXISTS blocks_select ON public.blocks;
CREATE POLICY blocks_select ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS blocks_insert ON public.blocks;
CREATE POLICY blocks_insert ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

DROP POLICY IF EXISTS blocks_delete ON public.blocks;
CREATE POLICY blocks_delete ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;

-- ── 2. Fonction d'arbitrage — dans le schéma `private` (NON exposé) ─────────
-- SECURITY DEFINER : contourne la RLS de blocks pour vérifier les DEUX sens
-- même pour le bloqué. Placée dans `private` (que PostgREST n'expose pas) → elle
-- est utilisable dans les policies RLS mais N'EST PAS appelable en RPC par le
-- client : un utilisateur ne peut donc PAS sonder « est-ce que X m'a bloqué ? ».
-- S'appuie sur auth.uid() (ne concerne que des paires impliquant l'appelant).
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_blocked_with(other_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public          -- SECURITY : search_path figé (anti-shadowing)
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = other_id)
       OR (blocker_id = other_id   AND blocked_id = auth.uid())
  )
$$;

REVOKE ALL ON FUNCTION private.is_blocked_with(uuid) FROM public;
GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_blocked_with(uuid) TO authenticated, anon;

-- ── 3. RLS messages : on REMPLACE les policies (mêmes noms = pas de doublon
--      permissif en OR). Noms exacts repris du schema.sql. ──────────────────
DROP POLICY IF EXISTS "Voir ses messages" ON public.messages;
CREATE POLICY "Voir ses messages" ON public.messages FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND NOT private.is_blocked_with(CASE WHEN auth.uid() = sender_id THEN receiver_id ELSE sender_id END)
  );

DROP POLICY IF EXISTS "Envoyer un message" ON public.messages;
CREATE POLICY "Envoyer un message" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT private.is_blocked_with(receiver_id)
  );

-- ── 4. RLS offers : un bloqué ne peut ni créer ni voir d'offre ───
DROP POLICY IF EXISTS offers_select ON public.offers;
CREATE POLICY offers_select ON public.offers FOR SELECT
  USING (
    (auth.uid() = buyer_id OR auth.uid() = seller_id)
    AND NOT private.is_blocked_with(CASE WHEN auth.uid() = buyer_id THEN seller_id ELSE buyer_id END)
  );

DROP POLICY IF EXISTS offers_insert ON public.offers;
CREATE POLICY offers_insert ON public.offers FOR INSERT
  WITH CHECK (
    auth.uid() = proposed_by
    AND (auth.uid() = buyer_id OR auth.uid() = seller_id)
    AND NOT private.is_blocked_with(CASE WHEN auth.uid() = buyer_id THEN seller_id ELSE buyer_id END)
  );

-- ── 5. RLS follows + reviews : un bloqué ne peut pas s'abonner ni noter ──────
-- (on REMPLACE l'INSERT existant en gardant le même nom de policy)
DROP POLICY IF EXISTS "S'abonner" ON public.follows;
CREATE POLICY "S'abonner" ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND NOT private.is_blocked_with(following_id));

DROP POLICY IF EXISTS "Créer un avis" ON public.reviews;
CREATE POLICY "Créer un avis" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = buyer_id AND NOT private.is_blocked_with(seller_id));

-- (UPDATE "Marquer comme lu" messages : inchangée — la SELECT masque déjà les
--  messages bloqués. Côté serveur, respond-offer.js et create-checkout-session.js
--  font une vérif directe sur `blocks` (service key) car ils bypassent la RLS.)
