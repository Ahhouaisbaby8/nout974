-- ================================================================
-- NOUT — Migration : intégration transporteur UBN sur les commandes
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- Idempotente : peut être rejouée sans erreur
-- ================================================================
--
-- UBN (transporteur 974) est AJOUTÉ à côté de Chronopost. Quand l'acheteur choisit
-- une livraison UBN, on crée une expédition via l'API UBN (HUB) puis on stocke ici
-- les références retournées pour le suivi et le bordereau.
--
-- Doc : « UBN API Distant - Guide webmaster v4.5 ».
-- Sécurité : la clé API UBN n'est JAMAIS stockée en base ni dans le code, elle vit
-- en variable d'environnement Netlify (UBN_API_KEY).

ALTER TABLE orders
  -- Transporteur retenu pour la commande : 'chronopost' (défaut existant) ou 'ubn'
  ADD COLUMN IF NOT EXISTS carrier            TEXT,
  -- Code service UBN : relais / economique / express / express_pro / samedi_express
  ADD COLUMN IF NOT EXISTS ubn_service        TEXT,
  -- Référence commande envoyée au HUB (lien naturel commande NOUT ↔ UBN), unique
  ADD COLUMN IF NOT EXISTS ubn_ref_commande   TEXT,
  -- Numéro de suivi UBN (rempli quand l'expédition est créée / synchronisée)
  ADD COLUMN IF NOT EXISTS ubn_tracking_number TEXT,
  -- Lien de suivi pour l'acheteur (préférable au PDF pour le client final)
  ADD COLUMN IF NOT EXISTS ubn_tracking_url   TEXT,
  -- État du bordereau : available / pending / unavailable
  ADD COLUMN IF NOT EXISTS ubn_bordereau_status TEXT,
  -- Point relais choisi (id canonique renvoyé par /distant/points-relais)
  ADD COLUMN IF NOT EXISTS ubn_pr_user_id     TEXT,
  -- Infos lisibles du point relais (nom + ville) pour réafficher au client
  ADD COLUMN IF NOT EXISTS ubn_pr_label       TEXT;

-- ref_commande doit être unique par commande (le HUB rejette les doublons :
-- erreur duplicate_ref_commande). On l'impose aussi côté NOUT.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_ubn_ref_commande
  ON orders (ubn_ref_commande)
  WHERE ubn_ref_commande IS NOT NULL;
