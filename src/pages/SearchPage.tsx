import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [brandId, setBrandId] = useState(searchParams.get('brand') || '');
  const [modelId, setModelId] = useState(searchParams.get('model') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

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
      if (!brandId) return [];
      const { data } = await supabase.from('models').select('*').eq('brand_id', brandId).order('name');
      return data || [];
    },
    enabled: !!brandId,
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
    queryKey: ['search-listings', query, brandId, modelId, categoryId, condition, type, sortBy],
    queryFn: async () => {
      let q = supabase.from('listings').select('*, listing_images(*), listing_compatibility(*, brands(*), models(*))').eq('status', 'active');

      if (query) q = q.ilike('title', `%${query}%`);
      if (condition) q = q.eq('condition', condition);
      if (type) q = q.eq('type', type);

      if (brandId) {
        const { data: compatIds } = await supabase
          .from('listing_compatibility')
          .select('listing_id')
          .eq('brand_id', brandId);
        const ids = compatIds?.map((c: any) => c.listing_id) || [];
        if (ids.length > 0) q = q.in('id', ids);
        else return [];
      }

      if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
      else if (sortBy === 'price_asc') q = q.order('price', { ascending: true });
      else if (sortBy === 'price_desc') q = q.order('price', { ascending: false });

      const { data } = await q.limit(50);
      return data || [];
    },
  });

  const toggleFavorite = async (listingId: string) => {
    if (!user) { toast.error('Войдите, чтобы добавить в избранное'); return; }
    const isFav = favoriteIds?.includes(listingId);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
    }
  };

  const clearFilters = () => {
    setQuery(''); setBrandId(''); setModelId(''); setCategoryId(''); setCondition(''); setType('');
  };

  const hasFilters = brandId || modelId || categoryId || condition || type;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
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
          {/* Filters sidebar */}
          <aside className={`${showFilters ? 'fixed inset-0 z-50 overflow-y-auto bg-background p-4 md:static md:p-0' : 'hidden'} w-full shrink-0 space-y-4 md:block md:w-56`}>
            {showFilters && (
              <div className="flex items-center justify-between md:hidden">
                <h2 className="font-display text-lg font-bold">Фильтры</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Тип</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Все" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="part">Запчасти</SelectItem>
                  <SelectItem value="motorcycle">Мотоциклы</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Марка</Label>
              <Select value={brandId} onValueChange={(v) => { setBrandId(v); setModelId(''); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Любая" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любая</SelectItem>
                  {brands?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {brandId && brandId !== 'all' && models && models.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Модель</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Любая" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любая</SelectItem>
                    {models.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Состояние</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Любое" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любое</SelectItem>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="used">Б/У</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Все" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-muted-foreground">
                Сбросить фильтры
              </Button>
            )}

            {showFilters && (
              <Button className="w-full md:hidden" onClick={() => setShowFilters(false)}>
                Показать результаты
              </Button>
            )}
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {listings ? `${listings.length} объявлений` : 'Загрузка...'}
              </p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
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
