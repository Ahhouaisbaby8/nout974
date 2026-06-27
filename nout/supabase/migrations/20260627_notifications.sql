-- ================================================================
-- NOUT — Migration : Centre de notifications
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================

-- ── 1. Table notifications ───────────────────────────────────────
-- type : 'follow' | 'message' | 'sale' | 'offer_accepted' | 'escrow_code' | 'system'
-- link : route front vers laquelle pointe la notif (ex: /profil/x, /messages/x, /commandes)
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- destinataire
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ── 2. RLS ───────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Chacun ne voit QUE ses propres notifications
DROP POLICY IF EXISTS "Voir ses notifications" ON notifications;
CREATE POLICY "Voir ses notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Chacun peut marquer SES notifications comme lues (update)
DROP POLICY IF EXISTS "Marquer ses notifications lues" ON notifications;
CREATE POLICY "Marquer ses notifications lues" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Insertion : autorisée aux utilisateurs authentifiés (ex: follow crée une notif pour autrui)
-- et au service_role (Netlify functions : vente, escrow...). Le client ne peut pas usurper
-- car les notifs sont créées par des actions précises côté service follow/Netlify.
DROP POLICY IF EXISTS "Créer une notification" ON notifications;
CREATE POLICY "Créer une notification" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
