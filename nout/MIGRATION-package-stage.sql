-- ─── Étape lisible du colis sur les commandes ───────────────────────────────────────────────
-- But : savoir OÙ est physiquement le colis (pas juste « expédié » vs « livré »).
--   'not_handed' = pas remis au transporteur · 'in_transit' = en route · 'at_relay' = à retirer ·
--   'delivered'  = livré. Renseigné par chronopost-tracking / ubn-tracking. Sert à afficher l'état
--   reel ET à ne rembourser auto QUE si le colis n'a jamais ete pris en charge.
--
-- À PASSER dans Supabase → SQL Editor → Run. Sans risque : ajout de colonne, idempotent.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS package_stage text;

-- Valeur par defaut a l'expedition : on ne SAIT pas encore (l'etiquette est faite mais le transporteur
-- n'a peut-etre rien scanne). On laisse NULL → le suivi la remplira au 1er scan.
COMMENT ON COLUMN public.orders.package_stage IS
  'Etape colis: not_handed | in_transit | at_relay | delivered. Renseigne par le suivi transporteur.';
