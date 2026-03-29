
-- Fix security definer view by setting security_invoker
ALTER VIEW public.seller_stats SET (security_invoker = on);
