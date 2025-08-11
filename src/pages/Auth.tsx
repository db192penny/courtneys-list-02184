import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { extractStreetName } from "@/utils/address";
import SEO from "@/components/SEO";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";
const Auth = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const inviteToken = useMemo(() => {
    const q = params.get("invite") || "";
    const stored = localStorage.getItem("invite_token") || "";
    return (q || stored).trim();
  }, [params]);

  useEffect(() => {
    const hint = localStorage.getItem("invite_email");
    if (hint && !email) setEmail(hint);

    const addrParam = (params.get("address") || "").trim();
    const storedAddr = localStorage.getItem("prefill_address") || "";
    if (!address && (addrParam || storedAddr)) {
      setAddress(addrParam || storedAddr);
    }
  }, [email, address, params]);

  const finalizeOnboarding = useCallback(async (userId: string, userEmail: string | null) => {
    const pendingRaw = localStorage.getItem("pending_profile");
    const pending: null | { name: string; email: string; address: string; street_name?: string } = pendingRaw ? JSON.parse(pendingRaw) : null;

    function toSlug(s: string) {
      return (s || "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    try {
      if (pending) {
        const payload = {
          id: userId,
          email: userEmail || pending.email,
          name: pending.name,
          address: pending.address,
          street_name: pending.street_name || extractStreetName(pending.address),
        };
        const { error: upsertError } = await supabase.from("users").upsert(payload);
        if (upsertError) {
          console.error("[Auth] users upsert error:", upsertError);
        }

        const token = localStorage.getItem("invite_token") || inviteToken;
        if (token) {
          const { error: markErr } = await supabase.rpc("mark_invite_accepted", {
            _token: token,
            _user_id: userId,
          });
          if (markErr) console.warn("[Auth] mark_invite_accepted error (non-fatal):", markErr);
        }

        localStorage.removeItem("pending_profile");
      }

      // Try to detect HOA and go to its page
      let destination = "/household";
      try {
        const { data: hoaRes } = await supabase.rpc("get_my_hoa");
        const hoa = (hoaRes?.[0]?.hoa_name as string | undefined) || "";
        if (hoa) destination = `/communities/${toSlug(hoa)}`;
      } catch (e) {
        console.warn("[Auth] get_my_hoa failed (non-fatal):", e);
      }

      navigate(destination);
    } catch {
      navigate("/household");
    }
  }, [inviteToken, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Defer any Supabase calls out of the callback to avoid deadlocks
        setTimeout(() => finalizeOnboarding(session.user!.id, session.user!.email ?? null), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        finalizeOnboarding(session.user.id, session.user.email ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [finalizeOnboarding]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Name is required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Email is required", description: "Please enter your email.", variant: "destructive" });
      return;
    }
    if (!address.trim()) {
      toast({ title: "Address is required", description: "Please enter your full address.", variant: "destructive" });
      return;
    }

    const pending = {
      name: name.trim(),
      email: email.trim(),
      address: address.trim(),
      street_name: extractStreetName(address.trim()),
    };
    localStorage.setItem("pending_profile", JSON.stringify(pending));
    if (inviteToken) localStorage.setItem("invite_token", inviteToken);
    localStorage.setItem("invite_email", email.trim());

    const redirectUrl = `${window.location.origin}/auth?post_signup=1`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("[Auth] magic link error:", error);
      toast({ title: "Could not send magic link", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Check your email", description: "We sent you a secure sign-in link." });
  };

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Sign in — Courtney's List"
        description="Sign in with a magic link. Enter your name, email, and full address to get started."
        canonical={canonical}
      />
      <section className="container max-w-xl py-10">
        <h1 className="text-3xl font-semibold mb-6">Sign in</h1>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Get a magic link</CardTitle>
            <CardDescription>
              Enter your details and we'll email you a secure link to sign in.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

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
                <Label htmlFor="address">Full Address</Label>
                <AddressInput
                  id="address"
                  defaultValue={address}
                  onSelected={(p: AddressSelectedPayload) => setAddress(p.household_address)}
                  placeholder="123 Boca Bridges Way, Boca Raton, FL"
                />
                {!!address && (
                  <p className="text-xs text-muted-foreground">
                    Street inferred as: <span className="font-medium">{extractStreetName(address)}</span>
                  </p>
                )}
                {inviteToken && (
                  <p className="text-xs text-muted-foreground">Invite detected — you'll be granted access after sign-in.</p>
                )}
              </div>

              <Button type="submit" className="w-full">Send Magic Link</Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => navigate("/")}>Home</Button>
          </CardFooter>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          We’ll email a secure one-time link. No password required.
        </div>
      </section>
    </main>
  );
};

export default Auth;
