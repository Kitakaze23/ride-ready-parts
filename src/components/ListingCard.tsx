import { Heart, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  condition: 'new' | 'used';
  type: 'part' | 'motorcycle';
  city?: string | null;
  imageUrl?: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export function ListingCard({
  id, title, price, condition, type, city, imageUrl, isFavorited, onToggleFavorite,
}: ListingCardProps) {
  return (
    <div className="group animate-fade-in overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      <Link to={`/listing/${id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="text-3xl">🏍</span>
            </div>
          )}
          <div className="absolute left-2 top-2 flex gap-1">
            <Badge variant={condition === 'new' ? 'default' : 'secondary'} className="text-xs">
              {condition === 'new' ? 'Новый' : 'Б/У'}
            </Badge>
            {type === 'motorcycle' && (
              <Badge variant="outline" className="border-primary/30 bg-card/80 text-xs backdrop-blur-sm">
                Мотоцикл
              </Badge>
            )}
          </div>
        </div>
      </Link>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/listing/${id}`} className="flex-1">
            <h3 className="line-clamp-2 text-sm font-medium leading-tight transition-colors group-hover:text-primary">{title}</h3>
          </Link>
          {onToggleFavorite && (
            <button onClick={onToggleFavorite} className="shrink-0 p-1 transition-colors hover:text-primary">
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </button>
          )}
        </div>
        <p className="mt-1 font-display text-lg font-bold text-foreground">
          {price.toLocaleString('ru-RU')} ₽
        </p>
        {city && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {city}
          </p>
        )}
      </div>
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
