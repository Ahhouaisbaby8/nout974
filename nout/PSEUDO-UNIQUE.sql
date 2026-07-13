-- ================================================================
-- NOUT — Pseudo (username) UNIQUE (7 juillet 2026)
-- Empêche 2 comptes d'avoir le même pseudo. Insensible à la casse
-- (Marie = marie = MARIE) pour éviter les usurpations déguisées.
-- À lancer dans Supabase > SQL Editor, DANS L'ORDRE.
-- ================================================================

-- ── ÉTAPE 1 — VÉRIFIER s'il existe DÉJÀ des doublons (lance CETTE requête seule).
--    Si elle renvoie des lignes, il faut d'abord les corriger (étape 2) avant l'index.
SELECT lower(username) AS pseudo, count(*) AS nb
FROM public.profiles
WHERE username IS NOT NULL AND username <> ''
GROUP BY lower(username)
HAVING count(*) > 1
ORDER BY nb DESC;


-- ── ÉTAPE 2 — (SEULEMENT si l'étape 1 a renvoyé des doublons)
--    Renomme les doublons en ajoutant un suffixe court, en gardant le PLUS ANCIEN intact.
--    Le compte le plus ancien garde son pseudo ; les suivants reçoivent -2, -3, …
WITH ranked AS (
  SELECT id, username,
         row_number() OVER (PARTITION BY lower(username) ORDER BY created_at ASC) AS rn
  FROM public.profiles
  WHERE username IS NOT NULL AND username <> ''
)
UPDATE public.profiles p
SET username = p.username || '-' || r.rn
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;


-- ── ÉTAPE 3 — Poser la contrainte d'unicité (insensible à la casse).
--    Index UNIQUE sur lower(username) : bloque tout futur doublon, quelle que soit la casse.
--    IF NOT EXISTS = rejouable sans erreur.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND username <> '';

-- ================================================================
-- Après ça : toute tentative d'enregistrer un pseudo déjà pris est REJETÉE par la base
-- → le front affiche « Ce pseudo est déjà pris » (déjà géré dans Settings.jsx).
-- ================================================================
