
-- 1. listing_events table
CREATE TABLE IF NOT EXISTS public.listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'contact', 'favorite')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert listing events"
  ON public.listing_events FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Events viewable by everyone"
  ON public.listing_events FOR SELECT
  TO public
  USING (true);

-- 2. Performance indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_listing_events_listing_id ON public.listing_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_events_type ON public.listing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_listing_events_created ON public.listing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_condition ON public.listings(condition);
CREATE INDEX IF NOT EXISTS idx_listing_compatibility_brand ON public.listing_compatibility(brand_id);
CREATE INDEX IF NOT EXISTS idx_listing_compatibility_model ON public.listing_compatibility(model_id);
CREATE INDEX IF NOT EXISTS idx_listing_compatibility_listing ON public.listing_compatibility(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON public.listing_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON public.favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_to_user ON public.reviews(to_user_id);

-- 3. Anti-spam trigger
CREATE OR REPLACE FUNCTION public.check_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO active_count FROM public.listings WHERE user_id = NEW.user_id AND status = 'active';
  IF active_count >= 50 THEN RAISE EXCEPTION 'Maximum active listings limit reached (50)'; END IF;
  SELECT COUNT(*) INTO recent_count FROM public.listings WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';
  IF recent_count >= 10 THEN RAISE EXCEPTION 'Too many listings created recently. Please wait.'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_listing_limit_trigger ON public.listings;
CREATE TRIGGER check_listing_limit_trigger
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.check_listing_limit();

-- 4. Ranking function
CREATE OR REPLACE FUNCTION public.compute_listing_rank(p_listing_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing listings%ROWTYPE;
  v_relevance numeric := 0;
  v_seller_quality numeric := 0;
  v_listing_quality numeric := 0;
  v_engagement numeric := 0;
  v_freshness numeric := 0;
  v_price_score numeric := 0;
  v_penalty numeric := 0;
  v_rank numeric;
  v_image_count integer;
  v_desc_len integer;
  v_compat_count integer;
  v_views integer;
  v_favs integer;
  v_contacts integer;
  v_age_hours numeric;
  v_avg_price numeric;
  v_seller_rating numeric;
  v_seller_deals integer;
  v_seller_reviews integer;
  v_duplicate_count integer;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_image_count FROM listing_images WHERE listing_id = p_listing_id;
  v_desc_len := COALESCE(length(v_listing.description), 0);
  SELECT COUNT(*) INTO v_compat_count FROM listing_compatibility WHERE listing_id = p_listing_id;

  v_listing_quality := LEAST(v_image_count * 15, 40) + LEAST(v_desc_len / 10, 30) + LEAST(v_compat_count * 10, 30);
  v_listing_quality := LEAST(v_listing_quality, 100);

  SELECT COALESCE(avg_rating, 0), COALESCE(successful_deals, 0), COALESCE(total_reviews, 0)
  INTO v_seller_rating, v_seller_deals, v_seller_reviews
  FROM seller_stats WHERE user_id = v_listing.user_id;

  v_seller_quality := LEAST(v_seller_rating * 12, 60) + LEAST(v_seller_deals * 3, 25) + LEAST(v_seller_reviews * 2, 15);
  v_seller_quality := LEAST(v_seller_quality, 100);

  SELECT COUNT(*) INTO v_views FROM listing_events WHERE listing_id = p_listing_id AND event_type = 'view';
  SELECT COUNT(*) INTO v_favs FROM favorites WHERE listing_id = p_listing_id;
  SELECT COUNT(*) INTO v_contacts FROM listing_events WHERE listing_id = p_listing_id AND event_type = 'contact';

  v_engagement := LEAST(v_views * 0.5, 30) + LEAST(v_favs * 5, 35) + LEAST(v_contacts * 10, 35);
  v_engagement := LEAST(v_engagement, 100);

  v_age_hours := EXTRACT(EPOCH FROM (now() - v_listing.created_at)) / 3600.0;
  v_freshness := 100.0 * EXP(-0.005 * v_age_hours);

  SELECT AVG(price) INTO v_avg_price FROM listings WHERE type = v_listing.type AND status = 'active';
  IF v_avg_price > 0 AND v_avg_price IS NOT NULL THEN
    v_price_score := 100.0 * (1.0 - ABS(v_listing.price - v_avg_price) / GREATEST(v_avg_price, 1));
    v_price_score := GREATEST(v_price_score, 0);
  ELSE
    v_price_score := 50;
  END IF;

  v_relevance := LEAST(v_compat_count * 15, 50) + LEAST(v_desc_len / 5, 30) + LEAST(v_image_count * 5, 20);
  v_relevance := LEAST(v_relevance, 100);

  SELECT COUNT(*) INTO v_duplicate_count FROM listings
  WHERE user_id = v_listing.user_id AND title = v_listing.title AND id != p_listing_id AND status = 'active';
  
  v_penalty := v_duplicate_count * 20;
  IF v_image_count = 0 THEN v_penalty := v_penalty + 15; END IF;

  v_rank := 0.35 * v_relevance + 0.20 * v_seller_quality + 0.15 * v_listing_quality +
            0.15 * v_engagement + 0.10 * v_freshness + 0.05 * v_price_score - v_penalty;

  IF v_age_hours < 24 THEN v_rank := v_rank + 15 * (1 - v_age_hours / 24.0); END IF;

  RETURN GREATEST(v_rank, 0);
END;
$$;

-- 5. Recreate seller_stats view with trust_score
DROP VIEW IF EXISTS public.seller_stats;

CREATE VIEW public.seller_stats AS
SELECT 
  p.user_id,
  p.name,
  p.avatar_url,
  p.city,
  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
  COUNT(DISTINCT r.id)::integer AS total_reviews,
  COUNT(DISTINCT CASE WHEN l.status = 'sold' THEN l.id END)::integer AS successful_deals,
  COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END)::integer AS active_listings,
  LEAST(100, GREATEST(0, 
    50 + LEAST(COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) * 6, 30) +
    LEAST(COUNT(DISTINCT CASE WHEN l.status = 'sold' THEN l.id END) * 2, 20) -
    GREATEST(0, (5 - COUNT(DISTINCT r.id)::integer)) * 2
  ))::integer AS trust_score
FROM profiles p
LEFT JOIN reviews r ON r.to_user_id = p.user_id
LEFT JOIN listings l ON l.user_id = p.user_id
GROUP BY p.user_id, p.name, p.avatar_url, p.city;
