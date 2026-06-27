-- ================================================================
-- NOUT — Migration : Système d'abonnement (follow vendeurs)
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================

-- ── 1. Table follows ─────────────────────────────────────────────
-- follower_id  = celui qui s'abonne
-- following_id = celui qu'on suit (le vendeur)
CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  -- On ne peut pas s'abonner à soi-même
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

-- Index pour compter rapidement abonnés / abonnements
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);

-- ── 2. RLS ───────────────────────────────────────────────────────
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Lecture publique : nécessaire pour afficher les compteurs sur les profils
DROP POLICY IF EXISTS "Abonnements lisibles" ON follows;
CREATE POLICY "Abonnements lisibles" ON follows
  FOR SELECT USING (true);

-- S'abonner : on ne peut créer qu'un abonnement où on est soi-même le follower
DROP POLICY IF EXISTS "S'abonner" ON follows;
CREATE POLICY "S'abonner" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Se désabonner : on ne peut supprimer que ses propres abonnements
DROP POLICY IF EXISTS "Se désabonner" ON follows;
CREATE POLICY "Se désabonner" ON follows
  FOR DELETE USING (auth.uid() = follower_id);
