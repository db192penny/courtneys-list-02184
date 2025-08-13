
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
import AdminBadges from "./pages/AdminBadges";
import Header from "./components/Header";

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
  return <Navigate to="/auth" replace />;
};

function AuthWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    let mounted = true;
    const redirectIfNeeded = (hasSession: boolean) => {
      if (!mounted) return;
      if (
        hasSession &&
        (location.pathname === "/" ||
          location.pathname === "/signin" ||
          location.pathname.startsWith("/auth"))
      ) {
        navigate("/communities/boca-bridges", { replace: true });
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
  }, [navigate, location.pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
          <AuthWatcher />
          <Header />
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
          <Route path="/admin/badges" element={<ProtectedRoute><AdminBadges /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/communities/:slug" element={<Community />} />
          <Route path="/communities/request" element={<CommunityRequest />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
