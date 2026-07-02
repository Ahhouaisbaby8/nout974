-- ================================================================
-- NOUT — Sécurité : colonne shipped_at sur orders (30 juin 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente — AUCUN risque.
--
-- Le code (update-order-shipping.js, ubn-create-shipment.js) écrit orders.shipped_at
-- au passage en 'shipped', et auto-refund.js le lit pour le filet de sécurité livraison.
-- La colonne n'était pas dans une migration versionnée → on la garantit ici.
-- IF NOT EXISTS = sans effet si la colonne existe déjà en base.
-- ================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
