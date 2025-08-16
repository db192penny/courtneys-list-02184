import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { Mail, AlertTriangle } from "lucide-react";

const SignIn = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "approved" | "pending" | "not_found" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);

  const community = searchParams.get("community");
  const communityName = community ? community.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;

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
        const redirectUrl = `${window.location.origin}/`;
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
        setShowMagicLinkModal(true);
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
            <CardTitle>Sign In to {communityName || "Courtney's List"}</CardTitle>
            <CardDescription>Enter your email to receive a magic link.</CardDescription>
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

      {/* Magic Link Sent Modal */}
      <Dialog open={showMagicLinkModal} onOpenChange={setShowMagicLinkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-green-600" />
              Magic Link Sent!
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              We've sent a magic link to <strong>{email}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Don't forget to check your spam folder!
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Magic links sometimes end up in spam or junk mail folders.
                </p>
              </div>
            </div>
            
            
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => setShowMagicLinkModal(false)} className="w-full">
                Got It!
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowMagicLinkModal(false);
                  handleSubmit(new Event('submit') as any);
                }}
                className="w-full"
              >
                Resend Magic Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default SignIn;