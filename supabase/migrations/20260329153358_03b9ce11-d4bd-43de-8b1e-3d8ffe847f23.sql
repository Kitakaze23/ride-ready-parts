
-- Enums
CREATE TYPE public.listing_condition AS ENUM ('new', 'used');
CREATE TYPE public.listing_type AS ENUM ('part', 'motorcycle');
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'archived');

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands viewable by everyone" ON public.brands FOR SELECT USING (true);

-- Models
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Models viewable by everyone" ON public.models FOR SELECT USING (true);

-- Generations
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year_from INT,
  year_to INT
);
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Generations viewable by everyone" ON public.generations FOR SELECT USING (true);

-- Categories (tree)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Listings
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  condition public.listing_condition NOT NULL DEFAULT 'used',
  type public.listing_type NOT NULL DEFAULT 'part',
  status public.listing_status NOT NULL DEFAULT 'active',
  city TEXT,
  views_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active listings viewable by everyone" ON public.listings FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Users create own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_listings_user ON public.listings(user_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_type ON public.listings(type);
CREATE INDEX idx_listings_price ON public.listings(price);

-- Listing Images
CREATE TABLE public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Images viewable by everyone" ON public.listing_images FOR SELECT USING (true);
CREATE POLICY "Users manage own listing images" ON public.listing_images FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid()));
CREATE POLICY "Users delete own listing images" ON public.listing_images FOR DELETE USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid()));

-- Listing Compatibility
CREATE TABLE public.listing_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id),
  model_id UUID REFERENCES public.models(id),
  generation_id UUID REFERENCES public.generations(id)
);
ALTER TABLE public.listing_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Compatibility viewable by everyone" ON public.listing_compatibility FOR SELECT USING (true);
CREATE POLICY "Users manage own compatibility" ON public.listing_compatibility FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid()));
CREATE POLICY "Users delete own compatibility" ON public.listing_compatibility FOR DELETE USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid()));

-- Listing Categories
CREATE TABLE public.listing_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id)
);
ALTER TABLE public.listing_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listing categories viewable" ON public.listing_categories FOR SELECT USING (true);
CREATE POLICY "Users manage own listing categories" ON public.listing_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid()));

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  communication INT CHECK (communication >= 1 AND communication <= 5),
  product_quality INT CHECK (product_quality >= 1 AND product_quality <= 5),
  accuracy INT CHECK (accuracy >= 1 AND accuracy <= 5),
  shipping_speed INT CHECK (shipping_speed >= 1 AND shipping_speed <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Auth users create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Chats
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, buyer_id, seller_id)
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own chats" ON public.chats FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Auth users create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view messages in own chats" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())));
CREATE POLICY "Users send messages in own chats" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())));
CREATE POLICY "Users mark messages as read" ON public.messages FOR UPDATE USING (EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())));

-- Enable realtime for messages and chats
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Seller stats view
CREATE OR REPLACE VIEW public.seller_stats AS
SELECT
  p.user_id,
  p.name,
  p.avatar_url,
  p.city,
  COALESCE(AVG(r.rating)::numeric(3,2), 0) as avg_rating,
  COUNT(r.id)::int as total_reviews,
  COUNT(DISTINCT CASE WHEN l.status = 'sold' THEN l.id END)::int as successful_deals,
  COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END)::int as active_listings
FROM public.profiles p
LEFT JOIN public.reviews r ON r.to_user_id = p.user_id
LEFT JOIN public.listings l ON l.user_id = p.user_id
GROUP BY p.user_id, p.name, p.avatar_url, p.city;

-- Storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);
CREATE POLICY "Listing images publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Auth users upload listing images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');
CREATE POLICY "Users delete own listing images" ON storage.objects FOR DELETE USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);
