import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import SearchPage from "./pages/SearchPage";
import ListingPage from "./pages/ListingPage";
import CreateListingPage from "./pages/CreateListingPage";
import MessagesPage from "./pages/MessagesPage";
import FavoritesPage from "./pages/FavoritesPage";
import SellerProfilePage from "./pages/SellerProfilePage";
import ProfilePage from "./pages/ProfilePage";
import EditListingPage from "./pages/EditListingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/listing/:id" element={<ListingPage />} />
            <Route path="/create-listing" element={<CreateListingPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/seller/:id" element={<SellerProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/edit-listing/:id" element={<EditListingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
