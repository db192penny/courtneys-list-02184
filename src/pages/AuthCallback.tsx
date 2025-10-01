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
        // Get community from URL params or localStorage
        const communityParam = searchParams.get("community");
        const storedCommunity = localStorage.getItem("pending_community");
        const community = communityParam || storedCommunity || "boca-bridges";
        
        // Format community name for display
        const displayName = community
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        setCommunityName(displayName);

        // Clean up localStorage
        if (storedCommunity) {
          localStorage.removeItem("pending_community");
        }

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

        // Check if user has completed their profile
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("address, name")
          .eq("id", session.user.id)
          .maybeSingle();

        // If user doesn't have an address, they need to complete their profile
        if (!userError && (!userData || !userData.address || userData.address === "Address Not Provided")) {
          // New Google user - needs to complete profile
          navigate(`/complete-profile?community=${community}`, { replace: true });
          return;
        }

        // Profile is complete - determine their community and redirect
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
              navigate(`/communities/${communitySlug}?welcome=true`, { replace: true });
              return;
            }
          } catch (e) {
            console.log("Could not determine community from address, using default");
          }
        }

        // Fallback - use the community from params or default
        navigate(`/communities/${community}?welcome=true`, { replace: true });
        
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
