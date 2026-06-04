-- ============================================================
-- NOUT 974 — Schéma Supabase complet
-- À coller dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (profils utilisateurs)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  phone         TEXT,
  city          TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  is_verified   BOOLEAN DEFAULT FALSE,
  stripe_account_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. LISTINGS (annonces)
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  category    TEXT NOT NULL,
  condition   TEXT NOT NULL CHECK (condition IN ('neuf','tres-bon','bon','acceptable','use')),
  images      TEXT[] DEFAULT '{}',
  city        TEXT NOT NULL,
  views       INTEGER DEFAULT 0,
  is_sold     BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index recherche full-text
CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING GIN (to_tsvector('french', title || ' ' || description));
CREATE INDEX IF NOT EXISTS listings_category_idx ON listings(category);
CREATE INDEX IF NOT EXISTS listings_city_idx ON listings(city);
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings(price);
CREATE INDEX IF NOT EXISTS listings_created_idx ON listings(created_at DESC);

-- ============================================================
-- 3. ORDERS (commandes)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id         UUID NOT NULL REFERENCES profiles(id),
  seller_id        UUID NOT NULL REFERENCES profiles(id),
  listing_id       UUID NOT NULL REFERENCES listings(id),
  total_price      NUMERIC(10,2) NOT NULL,
  shipping_method  TEXT NOT NULL CHECK (shipping_method IN ('hand','relay','home')),
  shipping_address TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled','disputed')),
  tracking_number  TEXT,
  stripe_payment_id TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  image_url   TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_sender_idx   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages(receiver_id);

-- ============================================================
-- 5. REVIEWS (avis)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id   UUID NOT NULL REFERENCES profiles(id),
  seller_id  UUID NOT NULL REFERENCES profiles(id),
  order_id   UUID NOT NULL REFERENCES orders(id),
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  image_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id, order_id)
);

-- ============================================================
-- 6. FAVORITES (favoris)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- ============================================================
-- 7. REPORTS (signalements)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
  message_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  reason      TEXT NOT NULL,
  details     TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','resolved','ignored')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS — updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_listings_updated  BEFORE UPDATE ON listings  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated    BEFORE UPDATE ON orders    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER — Créer profil automatiquement à l'inscription
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Sécurité par utilisateur
-- ============================================================

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports   ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profils publics lisibles"    ON profiles FOR SELECT USING (true);
CREATE POLICY "Modifier son propre profil"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- LISTINGS
CREATE POLICY "Annonces publiques lisibles" ON listings FOR SELECT USING (is_active = true);
CREATE POLICY "Créer ses annonces"          ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses annonces"       ON listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Supprimer ses annonces"      ON listings FOR DELETE USING (auth.uid() = user_id);

-- ORDERS
CREATE POLICY "Voir ses commandes"          ON orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Créer une commande"          ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Modifier statut commande"    ON orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- MESSAGES
CREATE POLICY "Voir ses messages"           ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Envoyer un message"          ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Marquer comme lu"            ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- REVIEWS
CREATE POLICY "Avis publics"                ON reviews FOR SELECT USING (true);
CREATE POLICY "Créer un avis"               ON reviews FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- FAVORITES
CREATE POLICY "Voir ses favoris"            ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Ajouter un favori"           ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supprimer un favori"         ON favorites FOR DELETE USING (auth.uid() = user_id);

-- REPORTS
CREATE POLICY "Créer un signalement"        ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ============================================================
-- STORAGE — Buckets fichiers
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true)  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars',  'avatars',  true)  ON CONFLICT DO NOTHING;

CREATE POLICY "Images annonces publiques"   ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Upload image annonce"        ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatars publics"             ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload avatar"               ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Modifier son avatar"         ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
