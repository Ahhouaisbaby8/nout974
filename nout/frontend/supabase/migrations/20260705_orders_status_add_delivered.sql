-- ================================================================
-- NOUT — RÉPARE la contrainte orders_status_check : réintègre 'delivered'
-- À exécuter dans Supabase > SQL Editor. Idempotente — AUCUN risque.
--
-- POURQUOI : la migration 20260701_order_status_chargeback.sql (dernière à toucher
-- la contrainte, exécutée le 3 juillet) a reconstruit la liste des statuts mais a
-- OUBLIÉ 'delivered'. Résultat en prod : chronopost-tracking.js fait
--   UPDATE orders SET status='delivered' ...  -> REJETÉ par la contrainte CHECK.
-- => aucune commande n'atteint jamais 'delivered' => release-delivered.js ne verse
--    jamais le vendeur => chaque vente livrée pourrit jusqu'au gel 12j (examen manuel).
--
-- Ce script rétablit la liste COMPLÈTE (delivered + chargeback + refunded inclus),
-- en retrouvant la contrainte quel que soit son nom.
-- ================================================================

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'paid',
    'shipped',
    'delivered',
    'disputed',
    'completed',
    'payout_pending',
    'refunded',
    'cancelled',
    'chargeback'
  ));
