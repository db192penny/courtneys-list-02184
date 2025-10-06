import { useState, useEffect } from "react";
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
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

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

  useEffect(() => {
    // Don't auto-redirect if we have a valid community
    if (!community) {
      // Try to detect community from referrer or default to the-bridges
      const referrer = document.referrer;
      if (referrer.includes('/communities/the-bridges')) {
        navigate('/signin?community=the-bridges', { replace: true });
      } else if (referrer.includes('/communities/boca-bridges')) {
        navigate('/signin?community=boca-bridges', { replace: true });
      } else {
        // Default to The Bridges instead of Boca Bridges
        navigate('/signin?community=the-bridges', { replace: true });
      }
    }
  }, [community, navigate]);
  const communityName = community ? community.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;

  const handleBack = () => {
    // Check if we have a community parameter
    if (community) {
      // Always go to the correct community page
      const communitySlug = community.toLowerCase();
      navigate(`/communities/${communitySlug}`, { replace: true });
    } else {
      // Try to detect from browser history or use The Bridges as default
      if (window.history.length > 1 && document.referrer) {
        if (document.referrer.includes('/communities/')) {
          navigate(-1);
        } else {
          navigate('/communities/the-bridges', { replace: true });
        }
      } else {
        navigate('/communities/the-bridges', { replace: true });
      }
    }
  };

  const resendMagicLink = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return;

    console.log("[SignIn] Resending magic link for:", targetEmail);
    setResendLoading(true);

    try {
      const communitySlug = community ? toSlug(community) : 'boca-bridges';
      const redirectUrl = `${window.location.origin}/communities/${communitySlug}?welcome=true`;
      console.log("[SignIn] resendMagicLink redirectUrl:", redirectUrl);
      
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Get community context
      const communityContext = community || "";
      
      // Allow Google OAuth for all Bridges communities
      if (!communityContext.toLowerCase().includes('bridges')) {
        toast({
          title: "Feature not available",
          description: "Google sign-in is currently only available for Bridges communities.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const redirectUrl = communityContext
        ? `${window.location.origin}/auth/callback?context=${communityContext}&intent=signin`
        : `${window.location.origin}/auth/callback?intent=signin`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      });
      
      if (error) {
        console.error('Google signin error:', error);
        toast({
          title: "Sign in failed",
          description: error.message || "Could not sign in with Google. Please try magic link instead.",
          variant: "destructive"
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Google signin error:', error);
      toast({
        title: "Sign in failed",
        description: "Could not sign in with Google. Please try magic link instead.",
        variant: "destructive"
      });
      setLoading(false);
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
        const communitySlug = community ? toSlug(community) : 'boca-bridges';
        const redirectUrl = `${window.location.origin}/communities/${communitySlug}?welcome=true`;
        console.log("[SignIn] handleSubmit redirectUrl:", redirectUrl);
        
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
        title={`Log In to ${communityName || "Courtney's List"} | Private Community Access`}
        description="Log in with your email to access your community's trusted vendor list."
        canonical={`${window.location.origin}/signin`}
      />
      <section className="container max-w-lg py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
            <div>
                <CardTitle>Log In to {communityName || "Courtney's List"}</CardTitle>
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
              <GoogleSignInButton 
                onClick={handleGoogleSignIn}
                loading={loading}
                label="Sign in with Google"
                community={community || ""}
              />
              
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
                {loading ? "Checking..." : "Log In"}
              </Button>

              <div className="text-sm text-muted-foreground">
                {status !== "idle" && (
                  <p role="status" aria-live="polite">{message}</p>
                )}
              </div>

              <div className="pt-2 text-center">
                <Link 
                  to={community ? `/auth?community=${community}` : "/communities/boca-bridges"} 
                  className="underline underline-offset-4"
                >
                  New to {communityName || "Courtney's List"}? Join Us
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