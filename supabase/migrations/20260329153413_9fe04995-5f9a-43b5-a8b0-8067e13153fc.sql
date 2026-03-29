
DROP VIEW IF EXISTS public.seller_stats;
CREATE OR REPLACE VIEW public.seller_stats WITH (security_invoker = true) AS
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
