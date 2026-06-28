-- ================================================================
-- NOUT — Migration : adresse + téléphone de livraison sur les commandes
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================
--
-- Quand l'acheteur choisit une LIVRAISON (relay/home), il doit fournir une adresse
-- complète + un téléphone (exigés par les transporteurs Chronopost/UBN pour livrer et
-- prévenir par SMS). En main propre, ces champs restent vides (non requis).
-- Saisis au checkout, stockés sur la commande, transmis au transporteur pour l'étiquette.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_phone     TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address   TEXT,   -- rue + complément
  ADD COLUMN IF NOT EXISTS shipping_city      TEXT,
  ADD COLUMN IF NOT EXISTS shipping_postcode  TEXT;
