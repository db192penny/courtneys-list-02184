import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MagicLinkLoader } from "@/components/MagicLinkLoader";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Extract community name synchronously from URL to avoid flash
  const contextParam = searchParams.get("context") || searchParams.get("community");
  const initialCommunityName = contextParam
    ? contextParam
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : "";
  
  const [communityName, setCommunityName] = useState<string>(initialCommunityName);
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      // Define contextParam at the top so it's available in catch block
      const contextParam = searchParams.get("context") || searchParams.get("community");
      
      // SET COMMUNITY NAME IMMEDIATELY for the loader
      if (contextParam) {
        const displayName = contextParam
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setCommunityName(displayName);
      }
      
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
        const intent = searchParams.get("intent"); // 'signup' or 'signin'

        // If no user record exists and this is Google OAuth
        if (!existingUser && isGoogleUser) {
          if (intent === 'signin') {
            // User tried to SIGN IN but has no account
            console.log("Sign-in attempted by non-registered user:", session.user.email);
            
            await supabase.auth.signOut();
            
            toast({
              title: "No account found",
              description: "You don't have an account yet. Please sign up first.",
              variant: "destructive",
              duration: 5000
            });
            
            const signupUrl = contextParam 
              ? `/auth?community=${contextParam}` 
              : '/auth';
            navigate(signupUrl, { replace: true });
            return;
          }
          
          if (intent === 'signup') {
            // User is signing up with Google - allow them to complete profile
            console.log("New Google signup:", session.user.email);
            
            const community = contextParam || "boca-bridges";
            navigate(`/complete-profile?community=${community}`, { replace: true });
            return;
          }
          
          // Fallback: no intent specified, treat as unauthorized sign-in attempt
          console.log("Google OAuth attempted by non-registered user (no intent):", session.user.email);
          
          await supabase.auth.signOut();
          
          toast({
            title: "Account not found",
            description: "No account exists for " + session.user.email + ". Please sign up first.",
            variant: "destructive",
            duration: 5000
          });
          
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
          const userCommunity = existingUser.signup_source.replace("community:", "");
          const communitySlug = userCommunity.toLowerCase().replace(/\s+/g, '-');
          setCommunityName(userCommunity);
          navigate(`/communities/${communitySlug}?welcome=true`, { replace: true });
          return;
        }

        // Fallback
        setCommunityName("Boca Bridges");
        navigate(`/communities/boca-bridges?welcome=true`, { replace: true });
        
      } catch (error) {
        console.error("Callback error:", error);
        const authUrl = contextParam ? `/auth?community=${contextParam}` : '/communities/boca-bridges';
        navigate(authUrl, { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams, toast]);

  return <MagicLinkLoader communityName={communityName || undefined} />;
};

export default AuthCallback;