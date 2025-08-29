import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Invite = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const tokenSafe = useMemo(() => token?.trim() || "", [token]);

  useEffect(() => {
    if (!tokenSafe) {
      toast({
        title: "Invalid invite link",
        description: "No invite code provided.",
        variant: "destructive",
      });
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
        console.error("[Invite] Code not found:", inviteError);
        toast({
          title: "Invalid invite code",
          description: "This invite code doesn't exist. Please request a new invite.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const invite = inviteData as any;

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        toast({
          title: "Expired invite",
          description: "This invite has expired. Please request a new invite.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Check if uses exceeded
      if (invite.uses_count >= invite.max_uses) {
        toast({
          title: "Invite limit reached",
          description: "This invite has reached its usage limit. Please request a new invite.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Get inviter name
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", invite.user_id)
        .single();

      const inviterName = userData?.name || "Your neighbor";
      
      // Store invite info for signup
      localStorage.setItem("invite_code", tokenSafe);
      localStorage.setItem("inviter_name", inviterName);
      
      toast({
        title: `Welcome! ${inviterName} invited you`,
        description: "Continue to create your account and join the community.",
      });

      // Redirect directly to auth with invite code
      navigate(`/auth?invite=${encodeURIComponent(tokenSafe)}`);
    };

    validateAndRedirect();
  }, [tokenSafe, toast, navigate]);

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