import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RatingStars, TrustBadge } from '@/components/TrustBadge';
import { type SellerStats, getTrustLevel, calculateTrustScore } from '@/lib/types';
import { MapPin } from 'lucide-react';

interface SellerCardProps {
  stats: SellerStats;
  compact?: boolean;
}

export function SellerCard({ stats, compact = false }: SellerCardProps) {
  const trustLevel = getTrustLevel(stats);
  const trustScore = calculateTrustScore(stats);
  const initials = (stats.name || 'U').slice(0, 2).toUpperCase();

  if (compact) {
    return (
      <Link to={`/seller/${stats.user_id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent">
        <Avatar className="h-10 w-10">
          <AvatarImage src={stats.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{stats.name || 'Продавец'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <RatingStars rating={stats.avg_rating} count={stats.total_reviews} />
          </div>
        </div>
        <TrustBadge level={trustLevel} />
      </Link>
    );
  }

  return (
    <Link to={`/seller/${stats.user_id}`} className="block rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={stats.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{stats.name || 'Продавец'}</h3>
            <TrustBadge level={trustLevel} score={trustScore} />
          </div>
          <RatingStars rating={stats.avg_rating} count={stats.total_reviews} size="md" />
          {stats.city && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {stats.city}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-muted px-3 py-2">
          <p className="font-display text-lg font-bold">{stats.successful_deals}</p>
          <p className="text-xs text-muted-foreground">Сделок</p>
        </div>
        <div className="rounded-lg bg-muted px-3 py-2">
          <p className="font-display text-lg font-bold">{stats.active_listings}</p>
          <p className="text-xs text-muted-foreground">Объявлений</p>
        </div>
      </div>
    </Link>
  );
}
