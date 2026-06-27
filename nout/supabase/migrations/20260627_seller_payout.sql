-- ================================================================
-- NOUT — Migration : colonne seller_payout sur orders
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================
--
-- Nouveau modèle tarifaire (27 juin 2026) : frais NOUT (10% + 0,25€) prélevés sur le VENDEUR.
-- seller_payout = ce que le vendeur touche réellement (prix − frais NOUT − frais Stripe).
-- Calculé à la création de la commande (create-checkout-session.js) et utilisé au
-- transfert escrow (confirm-escrow.js) pour ne verser que le net au vendeur.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS seller_payout NUMERIC(10,2);
