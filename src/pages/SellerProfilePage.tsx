import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { SellerCard } from '@/components/SellerCard';
import { RatingStars } from '@/components/TrustBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type SellerStats } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

export default function SellerProfilePage() {
  const { id } = useParams();

  const { data: stats } = useQuery({
    queryKey: ['seller-profile', id],
    queryFn: async () => {
      const { data } = await supabase.from('seller_stats').select('*').eq('user_id', id!).single();
      return data as SellerStats | null;
    },
    enabled: !!id,
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ['seller-listings', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(*)')
        .eq('user_id', id!)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['seller-reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles!reviews_from_user_id_fkey(name, avatar_url)')
        .eq('to_user_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6">
        {stats && <SellerCard stats={stats} />}

        {/* Listings */}
        <h2 className="mt-8 font-display text-xl font-bold">Объявления</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)
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
                />
              ))}
        </div>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <>
            <h2 className="mt-8 font-display text-xl font-bold">Отзывы</h2>
            <div className="mt-4 space-y-3">
              {reviews.map((review: any) => (
                <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(review.profiles?.name || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{review.profiles?.name || 'Пользователь'}</p>
                      <RatingStars rating={review.rating} />
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
