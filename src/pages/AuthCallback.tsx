import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MagicLinkLoader } from "@/components/MagicLinkLoader";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [communityName, setCommunityName] = useState<string>("");

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

        // Check if user exists and get their data
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("address, name, signup_source")
          .eq("id", session.user.id)
          .maybeSingle();

        // NEW USER: No address or incomplete profile
        if (!userError && (!userData || !userData.address || userData.address === "Address Not Provided")) {
          // Use context from URL for new user
          const community = contextParam || "boca-bridges";
          const displayName = community
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          setCommunityName(displayName);
          
          navigate(`/complete-profile?community=${community}`, { replace: true });
          return;
        }

        // EXISTING USER: Has complete profile
        // Priority 1: Use their signup_source community (ignore context)
        if (userData?.signup_source && userData.signup_source.startsWith("community:")) {
          const userCommunity = userData.signup_source.replace("community:", "");
          const communitySlug = userCommunity.toLowerCase().replace(/\s+/g, '-');
          const displayName = userCommunity
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          setCommunityName(displayName);
          
          navigate(`/communities/${communitySlug}?welcome=true`, { replace: true });
          return;
        }

        // Priority 2: Try to get community from their address mapping
        if (userData?.address && userData.address !== "Address Not Provided") {
          try {
            const { data: normalizedAddr } = await supabase.rpc("normalize_address", { 
              _addr: userData.address 
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
              const displayName = mapping.hoa_name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              setCommunityName(displayName);
              
              navigate(`/communities/${communitySlug}?welcome=true`, { replace: true });
              return;
            }
          } catch (e) {
            console.log("Could not determine community from address");
          }
        }

        // Fallback - use default
        setCommunityName("Boca Bridges");
        navigate(`/communities/boca-bridges?welcome=true`, { replace: true });
        
      } catch (error) {
        console.error("Callback error:", error);
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return <MagicLinkLoader communityName={communityName || undefined} />;
};

export default AuthCallback;
