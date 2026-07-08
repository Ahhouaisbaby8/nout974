-- ================================================================
-- NOUT — Nettoyage des commandes FANTÔMES (7 juillet 2026)
-- Les commandes 'pending' de plus d'1h = achats INITIÉS mais JAMAIS PAYÉS
-- (le paiement Stripe n'a pas abouti). Elles apparaissent avec un « — »
-- dans la liste des commandes et polluent l'affichage.
--
-- C'est EXACTEMENT ce que le cron auto-refund.js:50-70 fait automatiquement…
-- s'il tourne. S'il y en a beaucoup, c'est que le cron n'est pas déclenché
-- (→ voir la note Dawson : planifier auto-refund).
--
-- SÛR : ne touche QUE les 'pending' vieux d'plus d'1h. Ne touche À AUCUNE
-- vraie vente (paid, shipped, delivered, completed, etc. ne sont pas visés).
-- Idempotent (rejouable).
-- ================================================================

-- 1) VÉRIFIER d'abord ce qui sera annulé (lance CETTE requête seule pour voir) :
SELECT id, listing_id, buyer_id, created_at, total_price
FROM public.orders
WHERE status = 'pending'
  AND created_at < now() - interval '1 hour'
ORDER BY created_at DESC;

-- 2) Si la liste ci-dessus correspond bien aux commandes fantômes, exécuter :
UPDATE public.orders
SET status = 'cancelled'
WHERE status = 'pending'
  AND created_at < now() - interval '1 hour';
