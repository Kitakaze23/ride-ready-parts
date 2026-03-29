import { useState } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ['my-listings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);

  const startEdit = () => {
    setName(profile?.name || '');
    setCity(profile?.city || '');
    setPhone(profile?.phone || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ name, city, phone }).eq('user_id', user.id);
    if (error) toast.error('Ошибка сохранения');
    else {
      toast.success('Профиль обновлён');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  };

  if (!user) return <div className="min-h-screen bg-background"><Header /><div className="container py-16 text-center text-muted-foreground">Войдите в аккаунт</div></div>;

  const initials = (profile?.name || user.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6">
        {/* Profile header */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProfile}>Сохранить</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-xl font-bold">{profile?.name || user.email}</h1>
                {profile?.city && <p className="text-sm text-muted-foreground">{profile.city}</p>}
                <Button size="sm" variant="outline" className="mt-2" onClick={startEdit}>Редактировать</Button>
              </>
            )}
          </div>
        </div>

        {/* Listings */}
        <Tabs defaultValue="active" className="mt-6">
          <TabsList>
            <TabsTrigger value="active">Активные</TabsTrigger>
            <TabsTrigger value="sold">Проданные</TabsTrigger>
            <TabsTrigger value="archived">Архив</TabsTrigger>
          </TabsList>
          {['active', 'sold', 'archived'].map((status) => (
            <TabsContent key={status} value={status}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)
                  : listings?.filter((l: any) => l.status === status).map((listing: any) => (
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
              {!isLoading && listings?.filter((l: any) => l.status === status).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет объявлений</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
