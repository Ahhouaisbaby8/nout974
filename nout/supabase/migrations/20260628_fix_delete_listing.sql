-- ================================================================
-- NOUT — Fix : suppression d'annonce bloquée par les commandes liées
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================
--
-- PROBLÈME : orders.listing_id référence listings(id) SANS règle ON DELETE
-- (donc NO ACTION par défaut) → impossible de supprimer une annonce qui a au
-- moins une commande liée → "Erreur lors de la suppression".
--
-- SOLUTION : passer la FK en ON DELETE SET NULL. L'annonce peut être supprimée,
-- les commandes restent (traçabilité des ventes/litiges préservée), leur
-- listing_id devient NULL. On garde une copie du titre de l'annonce sur la
-- commande pour conserver un historique lisible même après suppression.

-- 1) Conserver le titre de l'annonce sur la commande (snapshot historique)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS listing_title TEXT;

-- Remplir le snapshot pour les commandes existantes qui ont encore leur annonce
UPDATE orders o
SET    listing_title = l.title
FROM   listings l
WHERE  o.listing_id = l.id
  AND  o.listing_title IS NULL;

-- 2) listing_id doit pouvoir devenir NULL (requis par ON DELETE SET NULL)
ALTER TABLE orders
  ALTER COLUMN listing_id DROP NOT NULL;

-- 3) Recréer la contrainte de clé étrangère avec ON DELETE SET NULL.
--    On retrouve le nom réel de la contrainte dynamiquement (il peut varier),
--    on la supprime puis on la recrée proprement.
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM   pg_constraint
  WHERE  conrelid = 'orders'::regclass
    AND  contype  = 'f'
    AND  confrelid = 'listings'::regclass
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE orders
    ADD CONSTRAINT orders_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
END $$;
