-- ================================================================
-- NOUT — Migration : sécurité paiement (corrections audit 28 juin)
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================

-- ── C3 : autoriser le statut 'refunded' (remboursement auto) ──────
-- L'ancien CHECK ne listait pas 'refunded' → auto-refund.js laissait les
-- commandes en état incohérent. On reconstruit la contrainte complète.
DO $$ BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'pending', 'paid', 'shipped', 'delivered',
    'completed', 'payout_pending', 'cancelled', 'disputed', 'refunded'
  ));

-- ── C4 : empêcher 2 commandes actives sur le même article ─────────
-- Index unique partiel : un listing ne peut avoir qu'UNE commande "vivante"
-- à la fois (réservée/payée/expédiée/finalisée). Les commandes annulées/
-- remboursées ne bloquent pas une nouvelle vente.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_listing_active_order
  ON orders(listing_id)
  WHERE status IN ('pending', 'paid', 'shipped', 'delivered', 'completed', 'payout_pending');

-- ── B : idempotence des webhooks Stripe ───────────────────────────
-- Trace des événements Stripe déjà traités, pour ignorer les re-livraisons.
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id    TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
-- Pas de policy : accès réservé au service_role (Netlify functions) uniquement.
