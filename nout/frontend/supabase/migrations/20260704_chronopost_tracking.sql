-- ================================================================
-- NOUT — Colonnes Chronopost sur orders (4 juillet 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente — AUCUN risque.
--
-- Complète la migration multi-transporteur (20260704_delivery_multi_carrier.sql, qui
-- ajoute carrier/delivery_option/relay_id/relay_label/delivered_at génériques).
-- Ici on ajoute le détail SPÉCIFIQUE Chronopost, en miroir des colonnes ubn_* existantes :
--   - chronopost_tracking_number : n° de suivi (skybillNumber, ex. XF522921129FR)
--   - chronopost_label_url       : étiquette PDF (URL de stockage, ou base64 selon usage)
--   - chronopost_status          : dernier code événement Chronopost connu (ex. 'D' = livré)
--
-- Le champ générique tracking_number reste rempli aussi (réutilise l'UI de suivi commune).
-- delivered_at (migration multi-carrier) est posé par chronopost-tracking.js sur l'event D.
-- IF NOT EXISTS = sans effet si les colonnes existent déjà.
-- ================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS chronopost_tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS chronopost_label_url       TEXT,
  ADD COLUMN IF NOT EXISTS chronopost_status          TEXT;
