import { Star, Shield } from 'lucide-react';
import { type TrustLevel, getTrustLabel } from '@/lib/types';

interface TrustBadgeProps {
  level: TrustLevel;
  score?: number;
  size?: 'sm' | 'md';
}

export function TrustBadge({ level, score, size = 'sm' }: TrustBadgeProps) {
  const colorMap = {
    green: 'bg-trust-green/15 text-trust-green border-trust-green/30',
    yellow: 'bg-trust-yellow/15 text-trust-yellow border-trust-yellow/30',
    red: 'bg-trust-red/15 text-trust-red border-trust-red/30',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${colorMap[level]} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <Shield className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {getTrustLabel(level)}
      {score !== undefined && <span className="opacity-70">({score})</span>}
    </span>
  );
}

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
}

export function RatingStars({ rating, count, size = 'sm' }: RatingStarsProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${iconSize} ${i <= Math.round(rating) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
        />
      ))}
      {rating > 0 && <span className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{rating.toFixed(1)}</span>}
      {count !== undefined && <span className={`text-muted-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>({count})</span>}
    </span>
  );
}
