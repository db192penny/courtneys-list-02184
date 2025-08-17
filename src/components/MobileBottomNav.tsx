import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Trophy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileBottomNavProps {
  communityName?: string;
}

export function MobileBottomNav({ communityName = "Boca Bridges" }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile } = useUserProfile();
  const isMobile = useIsMobile();
  
  const isAuthenticated = !!profile?.isAuthenticated;

  // Don't show on certain pages where it might interfere
  const hiddenRoutes = ['/auth', '/signin', '/submit'];
  const shouldHide = hiddenRoutes.some(route => location.pathname.startsWith(route));

  if (!isMobile || shouldHide) {
    return null;
  }

  const handleAddProvider = () => {
    navigate(`/submit?community=${encodeURIComponent(communityName)}`);
  };

  const handleRewards = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate(`/auth?community=${encodeURIComponent(communityName)}`);
    }
  };

  const handleCommunity = () => {
    navigate(`/communities/${communityName.toLowerCase().replace(/\s+/g, '-')}`);
  };

  const isOnCommunityPage = location.pathname.includes('/communities/');
  const isOnProfilePage = location.pathname === '/profile';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {/* Add Service Provider */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddProvider}
          className="flex flex-col items-center gap-1 h-auto py-2 px-2"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs text-muted-foreground">Add Provider</span>
        </Button>

        {/* Community Overview */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCommunity}
          className={`flex flex-col items-center gap-1 h-auto py-2 px-2 ${
            isOnCommunityPage ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span className="text-xs">{communityName}</span>
        </Button>

        {/* Rewards/Profile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRewards}
          className={`flex flex-col items-center gap-1 h-auto py-2 px-2 ${
            isOnProfilePage ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span className="text-xs">{isAuthenticated ? 'Rewards' : 'Sign Up'}</span>
        </Button>
      </div>
    </div>
  );
}