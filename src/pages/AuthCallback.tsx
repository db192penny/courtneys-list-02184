import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MagicLinkLoader } from "@/components/MagicLinkLoader";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [communityName, setCommunityName] = useState<string>("");
  const [communityPhotoUrl, setCommunityPhotoUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      // Define contextParam at the top so it's available in catch block
      const contextParam = searchParams.get("context") || searchParams.get("community");
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          const authUrl = contextParam ? `/auth?community=${contextParam}` : '/communities/boca-bridges';
          navigate(authUrl, { replace: true });
          return;
        }

        if (!session) {
          console.error("No session found");
          const authUrl = contextParam ? `/auth?community=${contextParam}` : '/communities/boca-bridges';
          navigate(authUrl, { replace: true });
          return;
        }

        // CRITICAL FIX: Check if user is registered
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, signup_source, address, name, is_verified")
          .eq("email", session.user.email)
          .maybeSingle();

        // CHECK IF THIS IS A GOOGLE OAUTH USER
        const isGoogleUser = session.user.app_metadata?.provider === 'google';

        // If no user record exists and this is Google OAuth, reject them
        if (!existingUser && isGoogleUser) {
          console.log("Google OAuth attempted by non-registered user:", session.user.email);
          
          // Sign out immediately
          await supabase.auth.signOut();
          
          toast({
            title: "Account not found",
            description: "No account exists for " + session.user.email + ". Please sign up first.",
            variant: "destructive",
            duration: 5000
          });
          
          // Redirect to sign-up with community context if available
          const signupUrl = contextParam 
            ? `/auth?community=${contextParam}` 
            : '/auth';
          navigate(signupUrl, { replace: true });
          return;
        }

        // If no user record for magic link (shouldn't happen but safety check)
        if (!existingUser && !isGoogleUser) {
          await supabase.auth.signOut();
          
          toast({
            title: "Account not found",
            description: "Please sign up to request access.",
            variant: "destructive"
          });
          
          const authUrl = contextParam ? `/auth?community=${contextParam}` : '/communities/boca-bridges';
          navigate(authUrl, { replace: true });
          return;
        }

        // Check if user is deactivated
        if (existingUser && existingUser.is_verified === false) {
          await supabase.auth.signOut();
          
          toast({
            title: "Account disabled",
            description: "Your account has been disabled. Please contact support.",
            variant: "destructive"
          });
          
          navigate('/signin', { replace: true });
          return;
        }

        // User is valid - proceed with navigation
        if (existingUser.signup_source && existingUser.signup_source.startsWith("community:")) {
          const rawCommunity = existingUser.signup_source.replace("community:", "");
          // Normalize to display name (title case) and slug
          const displayCommunity = rawCommunity
            .replace(/-/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase());
          const communitySlug = rawCommunity
            .toLowerCase()
            .replace(/\s+/g, '-');
          setCommunityName(displayCommunity);
          
          // Fetch community photo by HOA name
          const { data: communityAssets } = await supabase
            .from("community_assets")
            .select("photo_path")
            .eq("hoa_name", displayCommunity)
            .maybeSingle();
          
          if (communityAssets?.photo_path) {
            const { data: urlData } = supabase.storage
              .from("community-photos")
              .getPublicUrl(communityAssets.photo_path);
            setCommunityPhotoUrl(urlData.publicUrl);
          }
          
          navigate(`/communities/${communitySlug}?welcome=true`, { replace: true });
          return;
        }

        // Fallback
        setCommunityName("Boca Bridges");
        
        // Fetch Boca Bridges photo
        const { data: bbAssets } = await supabase
          .from("community_assets")
          .select("photo_path")
          .eq("hoa_name", "Boca Bridges")
          .maybeSingle();
        
        if (bbAssets?.photo_path) {
          const { data: urlData } = supabase.storage
            .from("community-photos")
            .getPublicUrl(bbAssets.photo_path);
          setCommunityPhotoUrl(urlData.publicUrl);
        }
        
        navigate(`/communities/boca-bridges?welcome=true`, { replace: true });
        
      } catch (error) {
        console.error("Callback error:", error);
        const authUrl = contextParam ? `/auth?community=${contextParam}` : '/communities/boca-bridges';
        navigate(authUrl, { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams, toast]);

  return <MagicLinkLoader communityName={communityName || undefined} communityPhotoUrl={communityPhotoUrl || undefined} />;
};

export default AuthCallback;