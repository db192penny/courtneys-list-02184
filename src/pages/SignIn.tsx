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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Preserve community through OAuth flow
      let communitySlug = community || "boca-bridges";
      
      // Store community in localStorage to preserve through OAuth redirect
      localStorage.setItem('pending_community', communitySlug);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?community=${communitySlug}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: "Authentication failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
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
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                type="button"
                variant="outline"
                className="w-full mb-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

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