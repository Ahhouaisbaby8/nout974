-- Ajout colonne brand à la table listings
-- La colonne existait déjà dans le code front (CreateListing.jsx) mais pas en base
ALTER TABLE listings ADD COLUMN IF NOT EXISTS brand TEXT;
CREATE INDEX IF NOT EXISTS listings_brand_idx ON listings(brand);
