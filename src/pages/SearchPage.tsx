import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/Header';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { SearchFilters } from '@/components/search/SearchFilters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { fetchRankedListings } from '@/lib/ranking';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [brandId, setBrandId] = useState(searchParams.get('brand') || '');
  const [modelId, setModelId] = useState(searchParams.get('model') || '');
  const [generationId, setGenerationId] = useState(searchParams.get('generation') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('ranked');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').order('name');
      return data || [];
    },
  });

  const { data: models } = useQuery({
    queryKey: ['models', brandId],
    queryFn: async () => {
      if (!brandId || brandId === 'all') return [];
      const { data } = await supabase.from('models').select('*').eq('brand_id', brandId).order('name');
      return data || [];
    },
    enabled: !!brandId && brandId !== 'all',
  });

  const { data: generations } = useQuery({
    queryKey: ['generations', modelId],
    queryFn: async () => {
      if (!modelId || modelId === 'all') return [];
      const { data } = await supabase.from('generations').select('*').eq('model_id', modelId).order('year_from');
      return data || [];
    },
    enabled: !!modelId && modelId !== 'all',
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      return data || [];
    },
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ['favorite-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', user.id);
      return data?.map((f: any) => f.listing_id) || [];
    },
    enabled: !!user,
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ['search-listings', query, brandId, modelId, generationId, categoryId, condition, type, sortBy, priceMin, priceMax],
    queryFn: () => fetchRankedListings({
      query, brandId, modelId, generationId, categoryId, condition, type, sortBy,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
    }),
  });

  const toggleFavorite = async (listingId: string) => {
    if (!user) { toast.error('Войдите, чтобы добавить в избранное'); return; }
    const isFav = favoriteIds?.includes(listingId);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
    }
    queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
  };

  const clearFilters = () => {
    setQuery(''); setBrandId(''); setModelId(''); setGenerationId('');
    setCategoryId(''); setCondition(''); setType(''); setPriceMin(''); setPriceMax('');
  };

  const hasFilters = !!(brandId || modelId || generationId || categoryId || condition || type || priceMin || priceMax);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск запчастей и мотоциклов..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2 md:hidden" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4" /> Фильтры
          </Button>
        </div>

        <div className="mt-4 flex gap-6">
          <SearchFilters
            type={type} setType={setType}
            brandId={brandId} setBrandId={setBrandId}
            modelId={modelId} setModelId={setModelId}
            generationId={generationId} setGenerationId={setGenerationId}
            condition={condition} setCondition={setCondition}
            categoryId={categoryId} setCategoryId={setCategoryId}
            priceMin={priceMin} setPriceMin={setPriceMin}
            priceMax={priceMax} setPriceMax={setPriceMax}
            brands={brands || []} models={models || []}
            generations={generations || []} categories={categories || []}
            showFilters={showFilters} setShowFilters={setShowFilters}
            onClear={clearFilters} hasFilters={hasFilters}
          />

          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {listings ? `${listings.length} объявлений` : 'Загрузка...'}
              </p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ranked">По релевантности</SelectItem>
                  <SelectItem value="newest">Новые</SelectItem>
                  <SelectItem value="price_asc">Цена ↑</SelectItem>
                  <SelectItem value="price_desc">Цена ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)
                : listings?.map((listing: any) => (
                    <ListingCard
                      key={listing.id}
                      id={listing.id}
                      title={listing.title}
                      price={listing.price}
                      condition={listing.condition}
                      type={listing.type}
                      city={listing.city}
                      imageUrl={listing.listing_images?.[0]?.url}
                      isFavorited={favoriteIds?.includes(listing.id)}
                      onToggleFavorite={() => toggleFavorite(listing.id)}
                    />
                  ))}
            </div>

            {!isLoading && listings?.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-lg font-medium text-muted-foreground">Ничего не найдено</p>
                <p className="mt-1 text-sm text-muted-foreground">Попробуйте изменить параметры поиска</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
