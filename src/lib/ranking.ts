import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch ranked listings using the DB ranking function.
 * Falls back to created_at sorting if ranking fails.
 */
export async function fetchRankedListings(filters: {
  query?: string;
  brandId?: string;
  modelId?: string;
  categoryId?: string;
  condition?: string;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: string;
  limit?: number;
}) {
  const {
    query, brandId, modelId, categoryId, condition, type,
    priceMin, priceMax, sortBy = 'ranked', limit = 50,
  } = filters;

  // Build base query
  let q = supabase
    .from('listings')
    .select('*, listing_images(*), listing_compatibility(*, brands(*), models(*))')
    .eq('status', 'active');

  // Text search
  if (query) {
    q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }

  // Filters
  if (condition && condition !== 'all') q = q.eq('condition', condition as 'new' | 'used');
  if (type && type !== 'all') q = q.eq('type', type as 'part' | 'motorcycle');
  if (priceMin !== undefined && priceMin > 0) q = q.gte('price', priceMin);
  if (priceMax !== undefined && priceMax > 0) q = q.lte('price', priceMax);

  // Brand/model compatibility filter
  if (brandId && brandId !== 'all') {
    const compatQuery = modelId && modelId !== 'all'
      ? supabase.from('listing_compatibility').select('listing_id').eq('brand_id', brandId).eq('model_id', modelId)
      : supabase.from('listing_compatibility').select('listing_id').eq('brand_id', brandId);
    
    const { data: compatIds } = await compatQuery;
    const ids = compatIds?.map((c: any) => c.listing_id) || [];
    if (ids.length === 0) return [];
    q = q.in('id', ids);
  }

  // Category filter
  if (categoryId && categoryId !== 'all') {
    const { data: catListings } = await supabase
      .from('listing_categories')
      .select('listing_id')
      .eq('category_id', categoryId);
    const ids = catListings?.map((c: any) => c.listing_id) || [];
    if (ids.length === 0) return [];
    q = q.in('id', ids);
  }

  // Sort
  if (sortBy === 'price_asc') q = q.order('price', { ascending: true });
  else if (sortBy === 'price_desc') q = q.order('price', { ascending: false });
  else q = q.order('created_at', { ascending: false });

  const { data: listings } = await q.limit(limit);
  if (!listings || listings.length === 0) return [];

  // For 'ranked' sort, compute rank scores client-side via RPC
  if (sortBy === 'ranked' || sortBy === 'newest') {
    // Fetch rank scores for all listings
    const rankPromises = listings.map(async (l: any) => {
      const { data } = await supabase.rpc('compute_listing_rank', { p_listing_id: l.id });
      return { ...l, rank_score: typeof data === 'number' ? data : 0 };
    });

    const ranked = await Promise.all(rankPromises);
    
    if (sortBy === 'ranked') {
      ranked.sort((a, b) => b.rank_score - a.rank_score);
    }
    
    return ranked;
  }

  return listings.map((l: any) => ({ ...l, rank_score: 0 }));
}
