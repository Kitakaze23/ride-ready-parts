
CREATE POLICY "Users delete own listing categories" ON public.listing_categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_categories.listing_id AND listings.user_id = auth.uid())
);
