import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, MessageCircle, Plus, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="text-primary">m-13</span>
          <span className="text-foreground">.store</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/search">
            <Button variant="ghost" size="sm" className="gap-2">
              <Search className="h-4 w-4" /> Поиск
            </Button>
          </Link>
          {user && (
            <>
              <Link to="/favorites">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Heart className="h-4 w-4" /> Избранное
                </Button>
              </Link>
              <Link to="/messages">
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" /> Сообщения
                </Button>
              </Link>
              <Link to="/create-listing">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Продать
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          {!user && (
            <Link to="/auth">
              <Button size="sm">Войти</Button>
            </Link>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="animate-fade-in border-t border-border bg-card p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link to="/search" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
              <Search className="h-4 w-4" /> Поиск
            </Link>
            {user ? (
              <>
                <Link to="/favorites" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <Heart className="h-4 w-4" /> Избранное
                </Link>
                <Link to="/messages" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <MessageCircle className="h-4 w-4" /> Сообщения
                </Link>
                <Link to="/create-listing" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <Plus className="h-4 w-4" /> Продать
                </Link>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <User className="h-4 w-4" /> Профиль
                </Link>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
                  <LogOut className="h-4 w-4" /> Выйти
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                <User className="h-4 w-4" /> Войти
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
