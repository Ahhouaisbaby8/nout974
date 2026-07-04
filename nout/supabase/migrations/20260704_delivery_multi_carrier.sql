-- ================================================================
-- NOUT — Livraison multi-transporteur (UBN + Chronopost) au checkout
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur (IF NOT EXISTS).
-- ================================================================
--
-- L'acheteur choisit son transporteur + son mode au checkout. On stocke ici, en plus des
-- colonnes existantes (shipping_method générique, shipping_fee figé, adresse), le détail :
--   - carrier         : 'ubn' | 'chronopost' | NULL (main propre)
--   - delivery_option : l'option exacte ('ubn_relay' / 'chrono_relay' / 'ubn_home' / 'chrono_home' / 'hand')
--   - relay_id        : id du point relais choisi (générique, quel que soit le transporteur)
--   - relay_label     : nom lisible du point relais (affichage acheteur/vendeur)
--   - delivered_at    : rempli par le SUIVI TRANSPORTEUR quand le colis est livré → déclenche la
--                       fenêtre de protection avant versement au vendeur (partage avec le suivi Chronopost).
--
-- NB : les colonnes UBN (ubn_pr_user_id, ubn_ref_commande…) existent déjà (20260628_ubn_shipping.sql).
-- NB : les colonnes chronopost_* (tracking/label/status) sont ajoutées par la migration Chronopost dédiée.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS carrier         TEXT,
  ADD COLUMN IF NOT EXISTS delivery_option TEXT,
  ADD COLUMN IF NOT EXISTS relay_id        TEXT,
  ADD COLUMN IF NOT EXISTS relay_label     TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMPTZ;
