
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { extractStreetName, isInBocaBridges } from "@/utils/address";

type AuthMode = "login" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Profile fields (signup)
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showNamePublic, setShowNamePublic] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const inviteToken = useMemo(() => {
    const q = params.get("invite") || "";
    const stored = localStorage.getItem("invite_token") || "";
    // Prefer query param, fallback to localStorage
    return (q || stored).trim();
  }, [params]);

  useEffect(() => {
    // Hydrate email hint if we stored one earlier
    const hint = localStorage.getItem("invite_email");
    if (hint && !email) setEmail(hint);
  }, [email]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    console.log("[Auth] Login attempt:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[Auth] login error:", error);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome back", description: "Redirecting to dashboard..." });
    // Ensure users row exists (id = auth.uid) with minimal fields if missing -> fetch and upsert if needed
    const user = data.user;
    if (user) {
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email || email,
        address: address || "Unknown",
        street_name: extractStreetName(address || "Unknown"),
        name: name || null,
        show_name_public: showNamePublic,
        is_anonymous: isAnonymous,
      });
    }
    navigate("/dashboard");
  };

  const onSignup = async (e: FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast({ title: "Address required", description: "Please enter your full address." , variant: "destructive" });
      return;
    }

    if (!isInBocaBridges(address)) {
      toast({
        title: "Address outside Boca Bridges?",
        description: "For MVP, admin may manually approve. You can continue for now.",
      });
    }

    console.log("[Auth] Signup attempt:", email);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      console.error("[Auth] signup error:", signUpError);
      toast({ title: "Signup failed", description: signUpError.message, variant: "destructive" });
      return;
    }

    // If email confirmation is enabled, session may be null. Attempt sign-in to get a session for the upsert.
    let user = signUpData.user;
    if (!signUpData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error("[Auth] post-signup sign-in error:", signInError);
        toast({ title: "Check your email", description: "Please confirm your email to finish signup." });
        return;
      }
      user = signInData.user;
    }

    if (!user) {
      toast({ title: "Signup pending", description: "Check your email to confirm your account." });
      return;
    }

    // Insert/Update user profile row with required fields (RLS: id must equal auth.uid())
    const upsertPayload = {
      id: user.id,
      email: user.email || email,
      name: name || null,
      address: address,
      street_name: extractStreetName(address),
      show_name_public: showNamePublic,
      is_anonymous: isAnonymous,
    };
    const { error: upsertError } = await supabase.from("users").upsert(upsertPayload);
    if (upsertError) {
      console.error("[Auth] users upsert error:", upsertError);
      toast({ title: "Could not save your profile", description: upsertError.message, variant: "destructive" });
      return;
    }

    // Mark invite accepted if token present
    if (inviteToken) {
      const { error: markErr } = await supabase.rpc("mark_invite_accepted", {
        _token: inviteToken,
        _user_id: user.id,
      });
      if (markErr) {
        console.warn("[Auth] mark_invite_accepted error (non-fatal):", markErr);
      } else {
        console.log("[Auth] Invite marked accepted.");
      }
    }

    // Persist email hint for Invite page display (optional)
    localStorage.setItem("invite_email", email);

    toast({ title: "Welcome!", description: "Account created. Redirecting to dashboard..." });
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-xl py-10">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>{mode === "signup" ? "Create your account" : "Log in"}</CardTitle>
            <CardDescription>
              {mode === "signup"
                ? "Join your neighbors on Courtney's List. Submit a vendor to unlock full access."
                : "Welcome back! Log in to continue."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={mode === "signup" ? onSignup : onLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  required
                />
              </div>

              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (optional)</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.currentTarget.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address (required)</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.currentTarget.value)}
                      placeholder="123 Boca Bridges Way, Boca Raton, FL"
                      required
                    />
                    {!!address && (
                      <p className="text-xs text-muted-foreground">
                        Street inferred as: <span className="font-medium">{extractStreetName(address)}</span>
                      </p>
                    )}
                    {inviteToken && (
                      <p className="text-xs text-muted-foreground">Invite token detected — access will be granted after signup.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Switch id="is-anon" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                      <Label htmlFor="is-anon">Stay Anonymous</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="show-name" checked={showNamePublic} onCheckedChange={setShowNamePublic} />
                      <Label htmlFor="show-name">Show my name publicly</Label>
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full">
                {mode === "signup" ? "Sign Up" : "Log In"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => navigate("/")}>Home</Button>
            <button
              className="text-sm text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Have an account? Log in" : "New here? Create an account"}
            </button>
          </CardFooter>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          After you submit your first vendor, your account will be verified and full access unlocked automatically.
        </div>
      </section>
    </main>
  );
};

export default Auth;
