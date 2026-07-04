-- ================================================================
-- NOUT — Autoriser le statut 'chargeback' sur orders (1er juillet 2026)
-- À exécuter dans Supabase > SQL Editor.
--
-- stripe-webhook.js (charge.dispute.created) passe une commande contestée en 'chargeback'.
-- On met donc à jour la contrainte CHECK du statut. Le bloc DO retrouve la contrainte quel que soit
-- son nom (au cas où ce n'est pas 'orders_status_check'), la supprime, puis on recrée l'ensemble complet.
-- Idempotente : ré-exécutable sans risque.
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
    'pending', 'paid', 'shipped', 'disputed',
    'completed', 'payout_pending', 'refunded', 'cancelled', 'chargeback'
  ));
