-- ============================================================
-- Messages : colonne `type` pour distinguer les cartes système
-- (ex. « Achat effectué » posée par le webhook Stripe) des messages texte.
-- ------------------------------------------------------------
-- Défaut 'text' → tous les messages existants + les envois client
-- (services/messages.js n'écrit pas `type`) restent des messages texte.
-- RLS inchangée (row-level : sender/receiver, cf. 20260629_blocks.sql).
-- Idempotent : rejouable sans effet.
-- ============================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';
