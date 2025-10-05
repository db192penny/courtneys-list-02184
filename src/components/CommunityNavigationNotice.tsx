import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

export function CommunityNavigationNotice() {
  const [userCommunity, setUserCommunity] = useState<string | null>(null);
  const [currentCommunity, setCurrentCommunity] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    const checkCommunity = async () => {
      // Extract community from URL
      const pathSegments = location.pathname.split('/');
      const communityIndex = pathSegments.indexOf('communities');
      const urlCommunity = communityIndex !== -1 && pathSegments[communityIndex + 1] 
        ? pathSegments[communityIndex + 1].replace(/-/g, ' ')
        : 'boca-bridges';
        
      // Format community name
      const current = urlCommunity
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      setCurrentCommunity(current);

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        // Get user's community from household_hoa
        const { data: userProfile } = await supabase
          .from('users')
          .select('address')
          .eq('id', userData.user.id)
          .single();

        if (userProfile?.address) {
          const normalizedAddress = userProfile.address.toLowerCase().trim();
          
          const { data: household } = await supabase
            .from('household_hoa')
            .select('hoa_name')
            .or(`household_address.eq.${userProfile.address},normalized_address.eq.${normalizedAddress}`)
            .limit(1)
            .single();
            
          if (household) {
            setUserCommunity(household.hoa_name);
          }
        }
      } catch (error) {
        console.error("Error checking community:", error);
      }
      
      setLoading(false);
    };
    
    checkCommunity();
  }, [location.pathname]);
  
  // Don't show if loading, user is in their community, or we don't know their community
  if (loading || !userCommunity || userCommunity === currentCommunity) {
    return null;
  }
  
  const communitySlug = userCommunity.toLowerCase().replace(/ /g, '-');
  
  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50/50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm">
          <strong>Note:</strong> You're viewing <strong>{currentCommunity}</strong> vendors. 
          Any reviews or costs you add will automatically appear in your community: <strong>{userCommunity}</strong>
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          asChild
          className="gap-1 whitespace-nowrap border-amber-300 hover:bg-amber-100"
        >
          <Link to={`/communities/${communitySlug}`}>
            <Home className="h-3 w-3" />
            Go to {userCommunity}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}