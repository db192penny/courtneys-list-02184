import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SEO from "@/components/SEO";
import { WelcomeBackModal } from "@/components/WelcomeBackModal";
import { toast } from "@/hooks/use-toast";
import { toSlug } from "@/utils/slug";
import { ArrowLeft, Loader2 } from "lucide-react";

const SignIn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "approved" | "pending" | "not_found" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showWelcomeBackModal, setShowWelcomeBackModal] = useState(false);
  const [modalShown, setModalShown] = useState(false);

  const community = searchParams.get("community");
  const communityName = community ? community.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;

  const handleBack = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to community page or home
      const fallbackUrl = community 
        ? `/communities/${toSlug(community)}`
        : "/communities/boca-bridges";
      navigate(fallbackUrl);
    }
  };

  const resendMagicLink = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return;

    console.log("[SignIn] Resending magic link for:", targetEmail);
    setResendLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/communities/boca-bridges?welcome=true`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { emailRedirectTo: redirectUrl },
      });
      
      if (signInError) {
        console.error("[SignIn] resend signInWithOtp error", signInError);
        toast({ title: "Resend failed", description: signInError.message, variant: "destructive" });
      } else {
        toast({ title: "Magic link resent!", description: "Please check your inbox (and spam folder)." });
      }
    } catch (error) {
      console.error("[SignIn] resend error", error);
      toast({ title: "Resend failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return;

    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const { data: statusResult, error: statusError } = await supabase.rpc("get_email_status", {
        _email: targetEmail,
      });

      if (statusError) {
        console.error("[SignIn] get_email_status error", statusError);
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
        toast({ title: "Sign in failed", description: statusError.message, variant: "destructive" });
        return;
      }

      if (statusResult === "approved") {
        const redirectUrl = `${window.location.origin}/communities/boca-bridges?welcome=true`;
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: { emailRedirectTo: redirectUrl },
        });
        if (signInError) {
          console.error("[SignIn] signInWithOtp error", signInError);
          setStatus("error");
          setMessage("Unable to send magic link. Please try again.");
          toast({ title: "Magic link error", description: signInError.message, variant: "destructive" });
          return;
        }
        setStatus("approved");
        setMessage("If that email is registered, a magic link has been sent. Please check your inbox.");
        
        // Prevent double modal display
        if (!modalShown) {
          console.log("[SignIn] Showing welcome back modal");
          setModalShown(true);
          setShowWelcomeBackModal(true);
        }
      } else if (statusResult === "not_found") {
        setStatus("not_found");
        setMessage("We couldn't find an account with that email. Please sign up to request access.");
      } else if (statusResult === "pending") {
        setStatus("pending");
        setMessage("Your request is still under review. Please check back later.");
      } else {
        setStatus("error");
        setMessage("Unexpected response. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <SEO
        title={`Sign In to ${communityName || "Courtney's List"} | Private Community Access`}
        description="Sign in with your email to access your community's trusted vendor list."
        canonical={`${window.location.origin}/signin`}
      />
      <section className="container max-w-lg py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
            <div>
                <CardTitle>Sign In to {communityName || "Courtney's List"}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Checking..." : "Sign In"}
              </Button>

              <div className="text-sm text-muted-foreground">
                {status !== "idle" && (
                  <p role="status" aria-live="polite">{message}</p>
                )}
              </div>

              <div className="pt-2 text-center">
                <Link 
                  to={community ? `/auth?community=${community}` : "/auth"} 
                  className="underline underline-offset-4"
                >
                  New to {communityName || "Courtney's List"}? Sign Up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <WelcomeBackModal
        open={showWelcomeBackModal}
        onOpenChange={(open) => {
          setShowWelcomeBackModal(open);
          if (!open) {
            // Navigate to check-email page when modal is dismissed
            const params = new URLSearchParams({ email });
            if (community) params.set("community", community);
            navigate(`/check-email?${params.toString()}`);
          }
        }}
        email={email}
        communityName={communityName || undefined}
      />
    </main>
  );
};

export default SignIn;