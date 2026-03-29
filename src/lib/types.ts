export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  brand_id: string;
  name: string;
}

export interface Generation {
  id: string;
  model_id: string;
  name: string;
  year_from: number | null;
  year_to: number | null;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  condition: 'new' | 'used';
  type: 'part' | 'motorcycle';
  status: 'active' | 'sold' | 'archived';
  city: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  position: number;
}

export interface ListingWithDetails extends Listing {
  listing_images: ListingImage[];
  listing_compatibility: {
    id: string;
    brand_id: string;
    model_id: string | null;
    generation_id: string | null;
    brands: Brand;
    models: Model | null;
  }[];
  profiles: Profile;
  favorites_count?: number;
  is_favorited?: boolean;
}

export interface SellerStats {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  avg_rating: number;
  total_reviews: number;
  successful_deals: number;
  active_listings: number;
  trust_score: number;
}

export interface Chat {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  from_user_id: string;
  to_user_id: string;
  listing_id: string | null;
  rating: number;
  communication: number | null;
  product_quality: number | null;
  accuracy: number | null;
  shipping_speed: number | null;
  comment: string | null;
  created_at: string;
}

export type TrustLevel = 'green' | 'yellow' | 'red';

export function getTrustLevel(stats: SellerStats): TrustLevel {
  const score = calculateTrustScore(stats);
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

export function calculateTrustScore(stats: SellerStats): number {
  let score = 50; // base
  score += Math.min(stats.avg_rating * 6, 30); // up to 30 from rating
  score += Math.min(stats.successful_deals * 2, 20); // up to 20 from deals
  score -= Math.max(0, 5 - stats.total_reviews) * 2; // penalty for few reviews
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getTrustLabel(level: TrustLevel): string {
  switch (level) {
    case 'green': return 'Надёжный';
    case 'yellow': return 'Средний';
    case 'red': return 'Новый';
  }
}
