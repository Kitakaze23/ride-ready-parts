import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Wrench, Zap, Disc3, SlidersHorizontal, ShieldCheck, Bike, Shirt, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import heroBg from '@/assets/hero-bg.jpg';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Двигатель': <Wrench className="h-5 w-5" />,
  'Электрика': <Zap className="h-5 w-5" />,
  'Тормоза': <Disc3 className="h-5 w-5" />,
  'Подвеска': <SlidersHorizontal className="h-5 w-5" />,
  'Кузовные детали': <ShieldCheck className="h-5 w-5" />,
  'Расходники': <Wrench className="h-5 w-5" />,
  'Аксессуары': <Bike className="h-5 w-5" />,
  'Экипировка': <Shirt className="h-5 w-5" />,
};

export default function Index() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data: categories } = useQuery({
    queryKey: ['categories-root'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').is('parent_id', null).order('name');
      return data || [];
    },
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
        </div>
        <div className="container relative z-10 py-16 md:py-24">
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary-foreground md:text-5xl">
              Запчасти и мотоциклы <span className="text-primary">от проверенных</span> продавцов
            </h1>
            <p className="mt-3 text-sm text-primary-foreground/70 md:text-base">
              Находите совместимые запчасти, покупайте у надёжных продавцов с рейтингом доверия
            </p>
            <form onSubmit={handleSearch} className="mt-6 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск запчастей или мотоциклов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 border-none bg-card/95 pl-10 backdrop-blur-sm"
                />
              </div>
              <Button type="submit" size="lg" className="h-11 gap-2 px-6">
                Найти <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Type Sections */}
      <section className="container py-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Link
            to="/search?type=motorcycle"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Bike className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold sm:text-xl">Мотоциклы</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Купить или продать мотоцикл</p>
            <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
          <Link
            to="/search?type=part"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Wrench className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold sm:text-xl">Запчасти</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Найти совместимые запчасти</p>
            <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-8">
        <h2 className="font-display text-xl font-bold">Категории</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              to={`/search?category=${cat.id}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {CATEGORY_ICONS[cat.name] || <Wrench className="h-5 w-5" />}
              </div>
              <span className="text-xs font-medium leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="container pb-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Новые объявления</h2>
          <Link to="/search" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Все <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)
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
          {!isLoading && (!listings || listings.length === 0) && (
            <div className="col-span-full py-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">Пока нет объявлений</p>
              <p className="mt-1 text-sm text-muted-foreground">Будьте первым — разместите своё!</p>
              <Link to="/create-listing">
                <Button className="mt-4">Разместить объявление</Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
