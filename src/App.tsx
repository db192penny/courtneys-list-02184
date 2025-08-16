import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import SubmitVendor from "./pages/SubmitVendor";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import SignIn from "./pages/SignIn";
import Invite from "./pages/Invite";
import Profile from "./pages/Profile"; // Added
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import CommunityRequest from "./pages/CommunityRequest";
import Household from "./pages/Household";
import HouseholdPreview from "./pages/HouseholdPreview";
import Community from "./pages/Community";
import CommunityPreview from "./pages/CommunityPreview";
import AdminBadges from "./pages/AdminBadges";
import AdminVendorSeed from "./pages/AdminVendorSeed";
import AdminVendorManagement from "./pages/AdminVendorManagement";
import AdminEditVendor from "./pages/AdminEditVendor";
import AdminCostManagement from "./pages/AdminCostManagement";
import AdminPreviewLinks from "./pages/AdminPreviewLinks";
import AdminPreviewUsers from "./pages/AdminPreviewUsers";
import AdminUsers from "./pages/AdminUsers";
import AdminAddressRequests from "./pages/AdminAddressRequests";
import Header from "./components/Header";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (authed) return <>{children}</>;
  
  // Unauthenticated: special handling for /household
  if (location.pathname === "/household") {
    let addr = "";
    if (typeof window !== "undefined") {
      try {
        addr = localStorage.getItem("prefill_address") || "";
      } catch {}
    }
    const dest = addr ? `/household/preview?addr=${encodeURIComponent(addr)}` : "/";
    return <Navigate to={dest} replace />;
  }
  
  // Preserve community context when redirecting to auth
  const currentSearch = location.search;
  const authUrl = currentSearch ? `/auth${currentSearch}` : "/auth";
  return <Navigate to={authUrl} replace />;
};

function AuthWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    let mounted = true;
    const redirectIfNeeded = (hasSession: boolean) => {
      if (!mounted) return;
      console.log('AuthWatcher: checking redirect', { 
        hasSession, 
        pathname: location.pathname, 
        search: location.search, 
        hash: location.hash,
        fullLocation: window.location.href 
      });
      
      if (hasSession) {
        // Handle authenticated users landing on /auth with community parameters (magic link users)
        if (location.pathname === "/auth") {
          const urlParams = new URLSearchParams(location.search);
          const communityParam = urlParams.get('community');
          const isVerified = urlParams.get('verified') === 'true';
          
          if (communityParam && isVerified) {
            console.log('AuthWatcher: detected authenticated magic link user, redirecting to community:', communityParam);
            navigate(`/communities/${communityParam}`, { replace: true });
            return;
          }
        }
        
        // Handle authenticated users on homepage - redirect to their community
        if (location.pathname === "/") {
          console.log('AuthWatcher: authenticated user on homepage, checking for community');
          // Check if user has a community and redirect
          const checkUserCommunity = async () => {
            try {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              console.log('AuthWatcher: got auth user:', authUser?.email);
              
              if (authUser) {
                const { data: user, error } = await supabase
                  .from('users')
                  .select('signup_source, address, email')
                  .eq('id', authUser.id)
                  .single();
                
                console.log('AuthWatcher: user data:', user, 'error:', error);
                
                if (user?.signup_source?.includes('Boca Bridges')) {
                  console.log('AuthWatcher: user has Boca Bridges signup source, redirecting');
                  navigate("/communities/boca-bridges", { replace: true });
                  return;
                }
                
                // Check if user is verified for any community (fallback)
                console.log('AuthWatcher: checking for any community verification');
                navigate("/communities/boca-bridges", { replace: true });
              }
            } catch (error) {
              console.error('AuthWatcher: error checking user community:', error);
              // Fallback to default community
              navigate("/communities/boca-bridges", { replace: true });
            }
          };
          
          checkUserCommunity();
        }
        // Only redirect from /signin - let /auth page handle its own community detection
        else if (location.pathname === "/signin") {
          console.log('AuthWatcher: redirecting authenticated user from signin');
          navigate("/communities/boca-bridges", { replace: true });
        }
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectIfNeeded(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      redirectIfNeeded(!!session);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, location.hash, location.search]);
  return null;
}

function ConditionalHeader() {
  const location = useLocation();
  const isPreviewRoute = location.pathname.startsWith('/community-preview/');
  
  return isPreviewRoute ? null : <Header />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
          <AuthWatcher />
          <ConditionalHeader />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/signup" element={<Auth />} /> {/* Alias to Auth */}
          <Route path="/invite/:token" element={<Invite />} />
          <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/communities/boca-bridges" replace /></ProtectedRoute>} />
          <Route path="/submit" element={<ProtectedRoute><SubmitVendor /></ProtectedRoute>} />
          
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} /> {/* New route */}
          <Route path="/household/preview" element={<HouseholdPreview />} />
          <Route path="/household" element={<ProtectedRoute><Household /></ProtectedRoute>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/badges" element={<AdminProtectedRoute><AdminBadges /></AdminProtectedRoute>} />
          <Route path="/admin/vendors/seed" element={<AdminProtectedRoute><AdminVendorSeed /></AdminProtectedRoute>} />
          <Route path="/admin/vendors/manage" element={<AdminProtectedRoute><AdminVendorManagement /></AdminProtectedRoute>} />
          <Route path="/admin/vendors/edit" element={<AdminProtectedRoute><AdminEditVendor /></AdminProtectedRoute>} />
           <Route path="/admin/costs" element={<AdminProtectedRoute><AdminCostManagement /></AdminProtectedRoute>} />
            <Route path="/admin/preview-links" element={<AdminProtectedRoute><AdminPreviewLinks /></AdminProtectedRoute>} />
            <Route path="/admin/preview-users" element={<AdminProtectedRoute><AdminPreviewUsers /></AdminProtectedRoute>} />
             <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
             <Route path="/admin/address-requests" element={<AdminProtectedRoute><AdminAddressRequests /></AdminProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/communities/:slug" element={<Community />} />
          <Route path="/communities/request" element={<CommunityRequest />} />
          <Route path="/community-preview/:slug" element={<CommunityPreview />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;