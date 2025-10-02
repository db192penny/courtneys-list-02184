import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MagicLinkLoader } from "@/components/MagicLinkLoader";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [communityName, setCommunityName] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get context from URL params
        const action = searchParams.get("action");  // "signup" or "signin"
        const contextParam = searchParams.get("context") || searchParams.get("community");
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          navigate("/auth", { replace: true });
          return;
        }

        if (!session) {
          console.error("No session found");
          navigate("/auth", { replace: true });
          return;
        }

        // CHECK IF USER EXISTS IN THE SYSTEM
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, signup_source, address, name, is_verified")
          .eq("email", session.user.email)
          .maybeSingle();

        // NO USER RECORD EXISTS
        if (!existingUser) {
          console.log("No user account found for:", session.user.email);
          
          // Check if this is a sign-in attempt (not a sign-up)
          if (action === "signin") {
            // This is a SIGN-IN attempt for non-existent user - BLOCK IT
            console.log("Sign-in attempted by non-existent user:", session.user.email);
            
            // Sign them out immediately
            await supabase.auth.signOut();
            
            // Clear session storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Show error and redirect to sign-up
            toast({
              title: "Account not found",
              description: "We couldn't find an account with that email. Please sign up to request access.",
              variant: "destructive"
            });
            
            // Redirect to sign-up page
            window.location.href = '/auth';
            return;
          }
          
          // This is a SIGN-UP - allow them to complete profile
          const community = contextParam || "boca-bridges";
          const displayName = community
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          setCommunityName(displayName);
          
          navigate(`/complete-profile?community=${community}`, { replace: true });
          return;
        }

        // USER EXISTS - Check if they're verified
        if (existingUser.is_verified === false) {
          await supabase.auth.signOut();
          
          toast({
            title: "Account disabled",
            description: "Your account has been disabled. Please contact support.",
            variant: "destructive"
          });
          
          navigate('/signin', { replace: true });
          return;
        }

        // EXISTING VERIFIED USER - Route to their community
        console.log("Existing user found:", session.user.email);
        
        // Use their stored signup_source community
        if (existingUser.signup_source && existingUser.signup_source.startsWith("community:")) {
          const userCommunity = existingUser.signup_source.replace("community:", "");
          const communitySlug = userCommunity.toLowerCase().replace(/\s+/g, '-');
          const displayName = userCommunity
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          setCommunityName(displayName);
          
          navigate(`/communities/${communitySlug}?welcome=true`, { replace: true });
          return;
        }

        // Fallback: Try to get community from their address mapping
        if (existingUser.address && existingUser.address !== "Address Not Provided") {
          try {
            const { data: normalizedAddr } = await supabase.rpc("normalize_address", { 
              _addr: existingUser.address 
            });
            
            const { data: mapping } = await supabase
              .from("household_hoa")
              .select("hoa_name")
              .eq("household_address", normalizedAddr)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (mapping?.hoa_name) {
              const communitySlug = mapping.hoa_name.toLowerCase().replace(/\s+/g, '-');
              const displayName = mapping.hoa_name;
              setCommunityName(displayName);
              
              navigate(`/communities/${communitySlug}?welcome=true`, { replace: true });
              return;
            }
          } catch (e) {
            console.log("Could not determine community from address");
          }
        }

        // Last resort for existing users
        setCommunityName("Boca Bridges");
        navigate(`/communities/boca-bridges?welcome=true`, { replace: true });
        
      } catch (error) {
        console.error("Callback error:", error);
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams, toast]);

  return <MagicLinkLoader communityName={communityName || undefined} />;
};

export default AuthCallback;
