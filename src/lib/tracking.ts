import { supabase } from '@/integrations/supabase/client';

type EventType = 'view' | 'click' | 'contact' | 'favorite';

const tracked = new Set<string>();

export async function trackEvent(listingId: string, eventType: EventType, userId?: string | null) {
  // Deduplicate view events per session
  if (eventType === 'view') {
    const key = `${listingId}:${eventType}`;
    if (tracked.has(key)) return;
    tracked.add(key);
  }

  try {
    await supabase.from('listing_events').insert({
      listing_id: listingId,
      user_id: userId || null,
      event_type: eventType,
    });
  } catch {
    // silently fail — tracking should never break UX
  }
}
