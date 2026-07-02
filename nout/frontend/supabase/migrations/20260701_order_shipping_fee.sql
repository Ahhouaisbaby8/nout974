-- ================================================================
-- NOUT — Figer le port sur la commande (1er juillet 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente — AUCUN risque.
--
-- create-checkout-session.js écrit orders.shipping_fee = port encaissé au moment de l'achat.
-- computeRefundAmount (_fees.js) l'utilise pour reconnaître le modèle « protection acheteur » de façon
-- STABLE (immunisé aux changements de tarif transporteur), au lieu de relire la table de tarifs courante.
-- Les commandes existantes restent à NULL → remboursement plein (comportement sûr).
-- ================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee numeric;
