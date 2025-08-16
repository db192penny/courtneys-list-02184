import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "approved" | "pending" | "not_found" | "error">("idle");
  const [message, setMessage] = useState("");
  const location = useLocation();

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
        toast({ title: "Magic link sent", description: `Check ${targetEmail} to continue.` });
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
        title="Sign In to Courtney's List | Private Community Access"
        description="Sign in with your email to access your community's trusted vendor list."
        canonical={`${window.location.origin}/signin`}
      />
      <section className="container max-w-lg py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign In to Courtney's List</CardTitle>
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
                  to={`/auth${location.search}`} 
                  className="underline underline-offset-4"
                >
                  New to Courtney's List? Sign Up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default SignIn;