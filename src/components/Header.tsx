import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, Trophy, Coffee, Star, Award, Medal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import useIsAdmin from "@/hooks/useIsAdmin";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBadgeLevels, getUserCurrentBadge, getUserNextBadge } from "@/hooks/useBadgeLevels";
import { Badge } from "@/components/ui/badge";

// Points Badge Component
function PointsBadge() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { data: badgeLevels } = useBadgeLevels();
  
  const points = profile?.points || 0;
  const currentBadge = getUserCurrentBadge(points, badgeLevels || []);
  
  // Determine which icon to show based on badge icon from database
  const getBadgeIcon = () => {
    if (!currentBadge) return <Star className="h-4 w-4" />;
    
    switch (currentBadge.icon) {
      case "coffee":
        return <Coffee className="h-4 w-4" />;
      case "star":
        return <Star className="h-4 w-4" />;
      case "trophy":
        return <Trophy className="h-4 w-4" />;
      case "award":
        return <Award className="h-4 w-4" />;
      case "medal":
        return <Medal className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate('/neighborhood-cred')}
      className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100 transition-all"
    >
      <span className="text-blue-600">{getBadgeIcon()}</span>
      <span className="font-semibold text-sm">{points}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">pts</span>
    </Button>
  );
}

// Mobile Menu Points Display
function MobilePointsDisplay() {
  const { data: profile } = useUserProfile();
  const { data: badgeLevels } = useBadgeLevels();
  
  const points = profile?.points || 0;
  const currentBadge = getUserCurrentBadge(points, badgeLevels || []);
  const nextBadge = getUserNextBadge(points, badgeLevels || []);
  const pointsToNext = nextBadge ? (nextBadge.min_points - points) : 0;
  
  return (
    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Your Points</span>
        <span className="text-lg font-bold text-blue-600">{points}</span>
      </div>
      {currentBadge && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{
                backgroundColor: currentBadge.color + '20',
                color: currentBadge.color,
                borderColor: currentBadge.color + '40'
              }}
            >
              {currentBadge.name}
            </Badge>
          </div>
          {pointsToNext > 0 && nextBadge && (
            <p className="text-xs text-muted-foreground">
              {pointsToNext} pts to {nextBadge.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const Header = () => {
  const [authed, setAuthed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Determine if we're on homepage to set default community context
  const isHomepage = location.pathname === "/";
  const isAuthPage = location.pathname === "/auth" || location.pathname === "/signin";
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
    { to: "/communities/boca-bridges", label: "Community" },
    { to: "/neighborhood-cred", label: "Points & Rewards" },
    { to: "/submit", label: "Submit Vendor" },
    { to: "/settings", label: "Settings" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ] : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-12 sm:h-14 items-center justify-between">
        <span className="font-semibold text-base sm:text-lg cursor-default">Courtney's List</span>
        
        {isMobile ? (
          <div className="flex items-center gap-2">
            {authed && <PointsBadge />}
            {authed ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    aria-label="Open navigation menu"
                    className="bg-white border-gray-300 hover:bg-gray-50 shadow-sm"
                  >
                    <Menu className="h-5 w-5 text-gray-700" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  
                  {/* Points Display at Top of Mobile Menu */}
                  <div className="mb-4">
                    <MobilePointsDisplay />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {navigationItems.map(({ to, label }) => (
                      <Button 
                        key={to}
                        asChild 
                        variant="ghost" 
                        className="justify-start text-left"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link to={to}>
                          {label === "Points & Rewards" ? (
                            <span className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-blue-600" />
                              <span>{label}</span>
                            </span>
                          ) : (
                            label
                          )}
                        </Link>
                      </Button>
                    ))}
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="justify-start text-left"
                      aria-label="Sign out"
                    >
                      Sign out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            ) : !isAuthPage ? (
              <Button asChild size="sm" className="text-sm">
                <Link to={signInLink}>Sign in</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {authed ? (
              <div className="flex items-center gap-2">
                <PointsBadge />
                <div className="flex items-center gap-1">
                  {navigationItems.map(({ to, label }) => (
                    <Button key={to} asChild variant="ghost" size="sm">
                      <Link to={to}>{label}</Link>
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out">
                    Sign out
                  </Button>
                </div>
              </div>
            ) : !isAuthPage ? (
              <Button asChild>
                <Link to={signInLink}>Sign in</Link>
              </Button>
            ) : null}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
