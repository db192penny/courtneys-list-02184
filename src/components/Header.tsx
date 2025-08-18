import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import useIsAdmin from "@/hooks/useIsAdmin";

const Header = () => {
  const [authed, setAuthed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Determine if we're on homepage to set default community context
  const isHomepage = location.pathname === "/";
  const signInLink = isHomepage ? "/signin?community=boca-bridges" : "/signin";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const navigationItems = authed ? [
    { to: "/communities/boca-bridges", label: "Boca Bridges Overview" },
    { to: "/profile", label: "Your Profile" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ] : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-12 sm:h-14 items-center justify-between">
        <span className="font-semibold text-base sm:text-lg cursor-default">Courtney's List</span>
        
        {isMobile ? (
          <div className="flex items-center gap-2">
            {authed ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Open navigation menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col gap-4 mt-6">
                    {navigationItems.map(({ to, label }) => (
                      <Button 
                        key={to}
                        asChild 
                        variant="ghost" 
                        className="justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link to={to}>{label}</Link>
                      </Button>
                    ))}
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="justify-start"
                      aria-label="Sign out"
                    >
                      Sign out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button asChild size="sm" className="text-sm">
                <Link to={signInLink}>Sign in</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {authed ? (
              <div className="flex items-center gap-1">
                {navigationItems.map(({ to, label }) => (
                  <Button key={to} asChild variant="ghost">
                    <Link to={to}>{label}</Link>
                  </Button>
                ))}
                <Button variant="ghost" onClick={handleSignOut} aria-label="Sign out">
                  Sign out
                </Button>
              </div>
            ) : (
              <Button asChild>
                <Link to={signInLink}>Sign in</Link>
              </Button>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
