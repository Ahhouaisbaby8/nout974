-- ================================================================
-- NOUT — Migration : Correction contrainte orders.status
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : DROP IF EXISTS + ADD garantit qu'elle peut être
-- rejouée sans erreur, que la contrainte ancienne soit en place
-- ou que la correction ait déjà été faite manuellement.
-- ================================================================

-- Liste complète des statuts utilisés dans le code (confirm-escrow.js,
-- admin-actions.js, admin-delete-user.js, delete-account.js, submit-review.js) :
--
--   pending        → commande créée, en attente de paiement
--   paid           → paiement Stripe confirmé (checkout.session.completed)
--   shipped        → article expédié (livraison à domicile)
--   delivered      → livré (non utilisé activement, conservé pour cohérence)
--   completed      → remise confirmée + transfert Stripe réussi
--   payout_pending → remise confirmée mais vendeur sans compte Stripe actif
--   cancelled      → commande annulée
--   disputed       → litige ouvert

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'pending',
      'paid',
      'shipped',
      'delivered',
      'completed',
      'payout_pending',
      'cancelled',
      'disputed'
    ));
