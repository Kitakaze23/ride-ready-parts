import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { SellerCard } from '@/components/SellerCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle, MapPin, Eye, Calendar, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState } from 'react';
import { type SellerStats } from '@/lib/types';

export default function ListingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(*), listing_compatibility(*, brands(*), models(*))')
        .eq('id', id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: sellerStats } = useQuery({
    queryKey: ['seller-stats', listing?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('seller_stats')
        .select('*')
        .eq('user_id', listing!.user_id)
        .single();
      return data as SellerStats | null;
    },
    enabled: !!listing?.user_id,
  });

  const { data: isFavorited } = useQuery({
    queryKey: ['is-favorited', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('listing_id', id!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const toggleFavorite = async () => {
    if (!user) { toast.error('Войдите, чтобы добавить в избранное'); return; }
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', id!);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: id! });
    }
  };

  const handleContact = async () => {
    if (!user) { toast.error('Войдите, чтобы написать продавцу'); navigate('/auth'); return; }
    if (!listing) return;

    // Find or create chat
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('buyer_id', user.id)
      .eq('seller_id', listing.user_id)
      .maybeSingle();

    if (existingChat) {
      navigate(`/messages?chat=${existingChat.id}`);
    } else {
      const { data: newChat } = await supabase
        .from('chats')
        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.user_id })
        .select('id')
        .single();
      if (newChat) navigate(`/messages?chat=${newChat.id}`);
    }
  };

  const images = listing?.listing_images?.sort((a: any, b: any) => a.position - b.position) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-6 space-y-4">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/4" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <p className="text-lg text-muted-foreground">Объявление не найдено</p>
        </div>
      </div>
    );
  }

  const compatibility = listing.listing_compatibility || [];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <div className="container py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Image gallery */}
            <div className="relative overflow-hidden rounded-xl bg-muted">
              {images.length > 0 ? (
                <>
                  <div className="aspect-[16/10]">
                    <img src={images[currentImage]?.url} alt={listing.title} className="h-full w-full object-cover" />
                  </div>
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setCurrentImage(Math.max(0, currentImage - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur-sm transition hover:bg-card">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={() => setCurrentImage(Math.min(images.length - 1, currentImage + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur-sm transition hover:bg-card">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_: any, i: number) => (
                          <button key={i} onClick={() => setCurrentImage(i)} className={`h-2 w-2 rounded-full transition ${i === currentImage ? 'bg-primary-foreground' : 'bg-primary-foreground/40'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center">
                  <span className="text-6xl">🏍</span>
                </div>
              )}
            </div>

            {/* Title & price */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="icon" onClick={toggleFavorite}>
                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Ссылка скопирована'); }}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-primary">
                {Number(listing.price).toLocaleString('ru-RU')} ₽
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={listing.condition === 'new' ? 'default' : 'secondary'}>
                  {listing.condition === 'new' ? 'Новый' : 'Б/У'}
                </Badge>
                <Badge variant="outline">
                  {listing.type === 'motorcycle' ? 'Мотоцикл' : 'Запчасть'}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                {listing.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {listing.city}</span>}
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {listing.views_count} просмотров</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(listing.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>

            {/* Compatibility */}
            {compatibility.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="font-display text-lg font-bold">Совместимость</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {compatibility.map((c: any) => (
                    <Badge key={c.id} variant="secondary" className="text-sm">
                      {c.brands?.name}{c.models ? ` ${c.models.name}` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="font-display text-lg font-bold">Описание</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 hidden lg:block">
            {sellerStats && <SellerCard stats={sellerStats} />}
            <Button className="w-full gap-2" size="lg" onClick={handleContact}>
              <MessageCircle className="h-5 w-5" /> Написать продавцу
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="container flex gap-2">
          {sellerStats && (
            <div className="flex-1">
              <SellerCard stats={sellerStats} compact />
            </div>
          )}
          <Button className="shrink-0 gap-2" onClick={handleContact}>
            <MessageCircle className="h-4 w-4" /> Написать
          </Button>
        </div>
      </div>
    </div>
  );
}
