import { Header } from '@/components/Header';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('favorites')
        .select('listing_id, listings(*, listing_images(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const removeFavorite = async (listingId: string) => {
    if (!user) return;
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  if (!user) return <div className="min-h-screen bg-background"><Header /><div className="container py-16 text-center text-muted-foreground">Войдите для просмотра избранного</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" /> Избранное
        </h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)
            : favorites?.map((fav: any) => {
                const listing = fav.listings;
                if (!listing) return null;
                return (
                  <ListingCard
                    key={listing.id}
                    id={listing.id}
                    title={listing.title}
                    price={listing.price}
                    condition={listing.condition}
                    type={listing.type}
                    city={listing.city}
                    imageUrl={listing.listing_images?.[0]?.url}
                    isFavorited
                    onToggleFavorite={() => removeFavorite(listing.id)}
                  />
                );
              })}
        </div>
        {!isLoading && (!favorites || favorites.length === 0) && (
          <div className="py-16 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-lg font-medium text-muted-foreground">Пока пусто</p>
            <p className="text-sm text-muted-foreground">Добавляйте понравившиеся объявления</p>
          </div>
        )}
      </div>
    </div>
  );
}
