-- ─── Étape lisible du colis sur les commandes ───────────────────────────────────────────────
-- But : savoir OÙ est physiquement le colis (pas juste « expédié » vs « livré »).
--   'not_handed' = pas remis au transporteur · 'in_transit' = en route · 'at_relay' = à retirer ·
--   'delivered'  = livré. Renseigné par chronopost-tracking / ubn-tracking. Sert à afficher l'état
--   reel ET à ne rembourser auto QUE si le colis n'a jamais ete pris en charge.
--
-- À PASSER dans Supabase → SQL Editor → Run. Sans risque : ajout de colonnes, idempotent.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS package_stage text;

-- Valeur par defaut a l'expedition : on ne SAIT pas encore (l'etiquette est faite mais le transporteur
-- n'a peut-etre rien scanne). On laisse NULL → le suivi la remplira au 1er scan.
COMMENT ON COLUMN public.orders.package_stage IS
  'Etape colis: not_handed | in_transit | at_relay | delivered. Renseigne par le suivi transporteur.';

-- DATE du dernier CHANGEMENT d'etape (ex. le moment ou le colis est arrive AU RELAIS). Sert au
-- compte a rebours de retrait montre a l'acheteur et aux relances J+3 / J+7. Renseigne par le suivi
-- transporteur uniquement quand l'etape change (pas a chaque passage).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS package_stage_at timestamptz;

COMMENT ON COLUMN public.orders.package_stage_at IS
  'Horodatage du passage a l''etape courante (package_stage). Base du compte a rebours de retrait relais.';

-- Anti-doublon des relances « va retirer ton colis » : palier deja envoye (0 = aucune, 3 = relance J+3
-- envoyee, 7 = relance J+7 envoyee). Evite de spammer l'acheteur a chaque passage du cron (toutes 15 min).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS relay_reminder_sent int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.relay_reminder_sent IS
  'Dernier palier de relance retrait relais envoye a l''acheteur (0 = aucun, 3 = J+3, 7 = J+7).';
