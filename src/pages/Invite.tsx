import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toSlug } from "@/utils/slug";

const Invite = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const tokenSafe = useMemo(() => token?.trim() || "", [token]);

  useEffect(() => {
    if (!tokenSafe) {
      console.warn("[Invite] No token provided, redirecting to home");
      navigate("/");
      return;
    }

    const validateAndRedirect = async () => {
      console.log("[Invite] Validating code:", tokenSafe);
      
      // Query the invite_codes table
      const { data: inviteData, error: inviteError } = await supabase
        .from("invite_codes" as any)
        .select("id, code, user_id, expires_at, max_uses, uses_count")
        .eq("code", tokenSafe)
        .single();

      if (inviteError || !inviteData) {
        console.warn("[Invite] Code not found:", inviteError?.message || "No data");
        navigate("/");
        return;
      }

      const invite = inviteData as any;

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        console.warn("[Invite] Code expired");
        navigate("/");
        return;
      }

      // Check if uses exceeded
      if (invite.uses_count >= invite.max_uses) {
        console.warn("[Invite] Code usage limit reached");
        navigate("/");
        return;
      }

      // Get inviter name and community info for proper redirect
      const { data: userData } = await supabase
        .from("users")
        .select("name, address")
        .eq("id", invite.user_id)
        .single();

      const inviterName = userData?.name || "Your neighbor";
      
      // Look up inviter's community
      let communitySlug = "boca-bridges"; // Default fallback
      if (userData?.address) {
        const { data: hoaData } = await supabase
          .from("household_hoa")
          .select("hoa_name")
          .eq("normalized_address", userData.address.toLowerCase().trim())
          .single();
        
        if (hoaData?.hoa_name) {
          communitySlug = toSlug(hoaData.hoa_name);
        }
      }
      
      // Store invite info for signup
      localStorage.setItem("invite_code", tokenSafe);
      localStorage.setItem("inviter_name", inviterName);
      
      console.log("[Invite] Valid code, redirecting to community:", communitySlug);
      
      // Redirect to community page with welcome flag
      navigate(`/communities/${communitySlug}?welcome=true`);
    };

    validateAndRedirect();
  }, [tokenSafe, navigate]);

  // Show loading while redirecting
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Validating your invite...</p>
      </div>
    </main>
  );
};

export default Invite;