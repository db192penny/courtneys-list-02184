import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type InviteInfo = {
  invite_id: string | null;
  invited_email: string | null;
  status: string | null;
  accepted: boolean | null;
  created_at: string | null;
};

const Invite = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const maskedEmail = (email?: string | null) => {
    if (!email) return "your email";
    const [user, domain] = email.split("@");
    if (!user || !domain) return email;
    const visible = user.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`;
  };

  const tokenSafe = useMemo(() => token?.trim() || "", [token]);

  useEffect(() => {
    if (!tokenSafe) return;
    const validate = async () => {
      console.log("[Invite] Validating token:", tokenSafe);
      const { data, error } = await supabase.rpc("validate_invite", { _token: tokenSafe });
      if (error) {
        toast({
          title: "Invite validation failed",
          description: "We couldn't validate this invite link. Please request a new invite.",
          variant: "destructive",
        });
        console.error("[Invite] validate_invite error:", error);
        return;
      }
      const info = (data?.[0] || null) as unknown as InviteInfo | null;
      if (!info || !info.invite_id) {
        toast({
          title: "Invalid invite",
          description: "This invite link is invalid or has expired.",
          variant: "destructive",
        });
        return;
      }
      if (info.accepted) {
        toast({
          title: "Invite already used",
          description: "This invite has already been accepted. Try logging in.",
        });
      } else {
        toast({
          title: "You're invited!",
          description: "Continue to create your account.",
        });
      }
      // Store token for use during signup
      localStorage.setItem("invite_token", tokenSafe);
    };
    validate();
  }, [tokenSafe, toast]);

  const handleContinue = () => {
    // Prefer passing token via query, also keep localStorage fallback
    navigate(`/auth?invite=${encodeURIComponent(tokenSafe)}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invitation</CardTitle>
            <CardDescription>Join Courtney's List — private community recommendations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Invite-only</Badge>
              <span className="text-sm text-muted-foreground">Secure access</span>
            </div>
            <p className="text-sm text-muted-foreground">
              If this link was emailed to you, continue to sign up using {maskedEmail(localStorage.getItem("invite_email"))}.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleContinue}>Continue to Sign Up</Button>
              <Button variant="secondary" onClick={() => navigate("/")}>Go Home</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Having trouble? You can request a new invite from the admin.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Invite;
