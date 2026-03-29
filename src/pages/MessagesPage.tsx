import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeChatId = searchParams.get('chat');
  const [selectedChat, setSelectedChat] = useState<string | null>(activeChatId);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('chats')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Get other user profiles for chat list
  const otherUserIds = chats?.map((c: any) => c.buyer_id === user?.id ? c.seller_id : c.buyer_id) || [];
  const { data: profiles } = useQuery({
    queryKey: ['chat-profiles', otherUserIds],
    queryFn: async () => {
      if (otherUserIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('*').in('user_id', otherUserIds);
      return data || [];
    },
    enabled: otherUserIds.length > 0,
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedChat],
    queryFn: async () => {
      if (!selectedChat) return [];
      const { data } = await supabase.from('messages').select('*').eq('chat_id', selectedChat).order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!selectedChat,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedChat) return;
    const channel = supabase
      .channel(`messages-${selectedChat}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedChat] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChat, queryClient]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !selectedChat) return;
    await supabase.from('messages').insert({ chat_id: selectedChat, sender_id: user.id, content: message.trim() });
    setMessage('');
  };

  const getProfile = (userId: string) => profiles?.find((p: any) => p.user_id === userId);

  if (!user) return <div className="min-h-screen bg-background"><Header /><div className="container py-16 text-center text-muted-foreground">Войдите для просмотра сообщений</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-4">
        <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-card">
          {/* Chat list */}
          <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-border md:w-72`}>
            <div className="border-b border-border p-3">
              <h2 className="font-display font-bold">Сообщения</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chatsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div>
                ))
              ) : chats?.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Нет сообщений</p>
              ) : (
                chats?.map((chat: any) => {
                  const otherId = chat.buyer_id === user.id ? chat.seller_id : chat.buyer_id;
                  const profile = getProfile(otherId);
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-accent ${selectedChat === chat.id ? 'bg-accent' : ''}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{(profile?.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{profile?.name || 'Пользователь'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(chat.updated_at).toLocaleDateString('ru-RU')}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat messages */}
          <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {selectedChat ? (
              <>
                <div className="border-b border-border p-3">
                  <button className="text-sm text-primary md:hidden" onClick={() => setSelectedChat(null)}>← Назад</button>
                  {(() => {
                    const chat = chats?.find((c: any) => c.id === selectedChat);
                    const otherId = chat ? (chat.buyer_id === user.id ? chat.seller_id : chat.buyer_id) : null;
                    const profile = otherId ? getProfile(otherId) : null;
                    return <p className="font-medium">{profile?.name || 'Чат'}</p>;
                  })()}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages?.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.sender_id === user.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p>{msg.content}</p>
                        <p className={`mt-1 text-[10px] ${msg.sender_id === user.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMessage} className="border-t border-border p-3 flex gap-2">
                  <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Сообщение..." className="flex-1" />
                  <Button type="submit" size="icon" disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Выберите чат</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
