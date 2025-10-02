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
        // Get context from URL params (what page they were on)
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

        // CRITICAL FIX: Check if this is a Google OAuth user
        const isGoogleUser = session.user.app_metadata?.provider === 'google';
        
        // CHECK IF THIS EMAIL IS REGISTERED IN YOUR SYSTEM
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, signup_source, address, name, is_verified")
          .eq("email", session.user.email)
          .maybeSingle();

        // If no user record exists, they need to sign up first
        if (!existingUser) {
          console.log("No user account found for:", session.user.email);
          
          // Sign out the user immediately
          await supabase.auth.signOut();
          
          if (isGoogleUser) {
            // For Google OAuth users without an account
            toast({
              title: "Account not found",
              description: "No account exists for this Google account. Please sign up first to request access.",
              variant: "destructive"
            });
            
            // Redirect to sign-up page with context if available
            const signupUrl = contextParam 
              ? `/auth?community=${contextParam}` 
              : '/auth';
            navigate(signupUrl, { replace: true });
            return;
          } else {
            // For magic link users without an account
            toast({
              title: "Account not found",
              description: "We couldn't find an account with that email. Please sign up to request access.",
              variant: "destructive"
            });
            
            navigate('/auth', { replace: true });
            return;
          }
        }

        // Check if user is deactivated/blocked
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

        // EXISTING USER: Has a record in users table
        console.log("Existing user found:", session.user.email);
        
        // Use their stored signup_source community (ignore context parameter)
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