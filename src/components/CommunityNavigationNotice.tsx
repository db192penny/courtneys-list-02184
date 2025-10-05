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
        
      // Format community name properly
      const current = urlCommunity
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      setCurrentCommunity(current);
      console.log('[CommunityNotice] Current community from URL:', current);

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          console.log('[CommunityNotice] No authenticated user');
          setLoading(false);
          return;
        }

        // Get user's address from profile
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('address')
          .eq('id', userData.user.id)
          .single();

        if (profileError || !userProfile?.address) {
          console.log('[CommunityNotice] No address found for user');
          setLoading(false);
          return;
        }

        console.log('[CommunityNotice] User address:', userProfile.address);

        // Create normalized version for comparison
        const normalizedUserAddress = userProfile.address.toLowerCase().trim();
        
        // Query household_hoa table with both exact and normalized address
        const { data: household, error: householdError } = await supabase
          .from('household_hoa')
          .select('hoa_name')
          .or(`household_address.eq.${userProfile.address},normalized_address.eq.${normalizedUserAddress}`)
          .limit(1)
          .maybeSingle();
          
        console.log('[CommunityNotice] Household result:', household);
        console.log('[CommunityNotice] Household error:', householdError);
        
        if (household?.hoa_name) {
          setUserCommunity(household.hoa_name);
          console.log('[CommunityNotice] User community set to:', household.hoa_name);
        } else {
          console.log('[CommunityNotice] No community mapping found');
        }
      } catch (error) {
        console.error("[CommunityNotice] Error checking community:", error);
      }
      
      setLoading(false);
    };
    
    checkCommunity();
  }, [location.pathname]);
  
  console.log('[CommunityNotice] State:', {
    loading,
    userCommunity,
    currentCommunity,
    shouldShow: !loading && userCommunity && userCommunity !== currentCommunity
  });
  
  // Don't show if loading, no user community, or user is in their community
  if (loading || !userCommunity || userCommunity.toLowerCase() === currentCommunity.toLowerCase()) {
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