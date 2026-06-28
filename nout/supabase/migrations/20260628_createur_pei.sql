-- ================================================================
-- NOUT — Migration : statut « Créateur péi » sur les profils
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================
--
-- Phase 1 de l'espace Créateurs : un vendeur peut se déclarer « Créateur péi »
-- (artisan qui fabrique lui-même à La Réunion). Affiche un badge sur son profil
-- et ses annonces, et apparaît dans la vitrine « Nos créateurs ».
--
-- Statut simplifié au lancement (artisanat) : pas de SIRET/TVA exigés à ce stade.
-- Le volet « boutique pro » (SIRET, CGV B2C…) viendra dans une phase ultérieure.

ALTER TABLE profiles
  -- Le vendeur s'est déclaré créateur péi (auto-déclaratif au lancement)
  ADD COLUMN IF NOT EXISTS is_creator    BOOLEAN DEFAULT false,
  -- Petite description de l'atelier / activité (optionnel, affiché sur la vitrine)
  ADD COLUMN IF NOT EXISTS creator_craft TEXT;

-- Index pour lister rapidement les créateurs (page vitrine)
CREATE INDEX IF NOT EXISTS idx_profiles_is_creator
  ON profiles (is_creator)
  WHERE is_creator = true;
