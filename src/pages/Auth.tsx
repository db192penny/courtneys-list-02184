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
import { toSlug } from "@/utils/slug";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
const Auth = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [resident, setResident] = useState<"yes" | "no">("yes");
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean; address?: boolean; resident?: boolean }>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const inviteToken = useMemo(() => {
    const q = params.get("invite") || "";
    const stored = localStorage.getItem("invite_token") || "";
    return (q || stored).trim();
  }, [params]);

  const communityName = useMemo(() => {
    return params.get("community") || "";
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
    const pending: null | { name: string; email: string; address: string; street_name?: string; signup_source?: string } = pendingRaw ? JSON.parse(pendingRaw) : null;


    try {
      if (pending) {
        const payload = {
          id: userId,
          email: userEmail || pending.email,
          name: pending.name,
          address: pending.address,
          street_name: pending.street_name || extractStreetName(pending.address),
          signup_source: (pending as any).signup_source || null,
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

      // Determine community from signup source first, then household mapping; fallback to profile onboarding
      let destination = "/profile?onboarding=1";
      console.log("[Auth] 🔍 Starting community detection for user:", userId);
      
      try {
        // PRIORITY 1: Check signup_source for community affiliation
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("address, signup_source")
          .eq("id", userId)
          .maybeSingle();

        if (userErr) {
          console.warn("[Auth] user lookup error:", userErr);
        }

        console.log("[Auth] 📍 User data:", { address: userData?.address, signup_source: userData?.signup_source });

        // Check if user signed up from a community page
        if (userData?.signup_source && userData.signup_source.startsWith("community:")) {
          const communityFromSignup = userData.signup_source.replace("community:", "");
          destination = `/communities/${toSlug(communityFromSignup)}`;
          console.log("[Auth] ✅ Community detected from signup_source, redirecting to:", destination);
        } else if (userData?.address) {
          // PRIORITY 2: Fall back to address-based detection
          console.log("[Auth] 🔍 No community signup_source, checking address-based detection");
          
          // Use the RPC function to get the normalized address first
          const { data: normalizedAddr } = await supabase.rpc("normalize_address", { _addr: userData.address });
          console.log("[Auth] 🔍 Normalized address:", normalizedAddr);
          
          const { data: mapping, error: mapErr } = await supabase
            .from("household_hoa")
            .select("hoa_name, created_at, household_address")
            .eq("household_address", normalizedAddr)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (mapErr) {
            console.warn("[Auth] household_hoa lookup error (non-fatal):", mapErr);
          }

          console.log("[Auth] 🏘️ HOA mapping found:", mapping);

          const hoaName = mapping?.hoa_name || "";
          if (hoaName) {
            destination = `/communities/${toSlug(hoaName)}`;
            console.log("[Auth] ✅ Community detected via address, redirecting to:", destination);
          } else {
            console.log("[Auth] ⚠️ No HOA mapping found, trying RPC fallback");
            // try RPC as additional fallback if available
            try {
              const { data: hoaRes } = await supabase.rpc("get_my_hoa");
              const rpcHoa = (hoaRes?.[0]?.hoa_name as string | undefined) || "";
              console.log("[Auth] 🔧 RPC result:", rpcHoa);
              if (rpcHoa) {
                destination = `/communities/${toSlug(rpcHoa)}`;
                console.log("[Auth] ✅ Community detected via RPC, redirecting to:", destination);
              }
            } catch (e) {
              console.warn("[Auth] get_my_hoa failed (non-fatal):", e);
            }
          }
        }
      } catch (e) {
        console.warn("[Auth] community detection failed (non-fatal):", e);
      }

      // Clean up any hash fragments and navigate
      const cleanDestination = destination.split('#')[0];
      navigate(cleanDestination, { replace: true });
    } catch (e) {
      console.warn("[Auth] finalizeOnboarding failed:", e);
      navigate("/profile?onboarding=1");
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

    if (resident === "no") {
      toast({ title: "Residents only", description: "Currently, access is restricted to residents only.", variant: "destructive" });
      return;
    }

    const fieldErrors = {
      name: !name.trim(),
      email: !email.trim(),
      address: !address.trim(),
      resident: !resident,
    };
    const missingKeys = (Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>).filter((k) => fieldErrors[k]);
    if (missingKeys.length > 0) {
      setErrors(fieldErrors);
      const labelMap: Record<string, string> = {
        name: "Name",
        email: "Email",
        address: "Full Address",
        resident: "Resident status",
      };
      const missingLabels = missingKeys.map((k) => labelMap[k as string]);
      toast({
        title: "Incomplete form",
        description: `Please complete ${missingLabels.join(", ")}`,
        variant: "destructive",
      });
      const firstId = missingKeys[0] === "resident" ? "resident" : (missingKeys[0] as string);
      setTimeout(() => document.getElementById(firstId)?.focus(), 0);
      return;
    } else {
      setErrors({});
    }

    // Check if user came from homepage (address prefilled from localStorage)
    const prefillAddress = localStorage.getItem("prefill_address");
    const cameFromHomepage = prefillAddress && address.trim() === prefillAddress.trim();
    
    const pending = {
      name: name.trim(),
      email: email.trim(),
      address: address.trim(),
      street_name: extractStreetName(address.trim()),
      signup_source: cameFromHomepage 
        ? `homepage:${communityName || "unknown"}` 
        : communityName ? `community:${communityName}` : undefined,
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
        title="Join Courtney's List"
        description="Join the invite only test family - automatically verified access to exclusive vendor info."
        canonical={canonical}
      />
      <section className="container max-w-xl py-10">
        <h1 className="text-3xl font-semibold mb-6">Join Courtney's List</h1>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>{communityName ? `${communityName} Fam` : "Request Access"}</CardTitle>
            <CardDescription>
              Since you are part of the invite only test family (thank you!), you will be automatically verified. In the future, neighbors will need to be accepted by an admin (umm, that will be me unless one of you cares to be <strong>so bold:)</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-xs text-muted-foreground">* Required fields</p>
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-foreground" aria-hidden>*</span></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  placeholder="Your full name"
                  required
                  className={errors.name ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-foreground" aria-hidden>*</span></Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="address">Full Address <span className="text-foreground" aria-hidden>*</span></Label>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Why we need your address" className="text-muted-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>We use your address to verify residency for community-only access.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className={errors.address ? "ring-2 ring-destructive rounded-md" : ""}>
                  <AddressInput
                    id="address"
                    defaultValue={address}
                    onSelected={(p: AddressSelectedPayload) => setAddress(p.household_address)}
                    placeholder="123 Boca Bridges Way, Boca Raton, FL"
                  />
                </div>
                {!!address && (
                  <p className="text-xs text-muted-foreground">
                    Street inferred as: <span className="font-medium">{extractStreetName(address)}</span>
                  </p>
                )}
                {inviteToken && (
                  <p className="text-xs text-muted-foreground">Invite detected — you'll be granted access after sign-in.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="resident">Are you a current resident? <span className="text-foreground" aria-hidden>*</span></Label>
                <Select value={resident} onValueChange={(v) => setResident(v as "yes" | "no")}>
                  <SelectTrigger id="resident" className={errors.resident ? "border-destructive focus-visible:ring-destructive" : undefined}>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
                {resident === "no" && (
                  <p className="text-xs text-destructive">Currently, access is restricted to residents only.</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={resident === "no"}>I'm VIP - let me in the Door!</Button>
            </form>
          </CardContent>

          {!communityName && (
            <CardFooter className="flex items-center justify-between">
              <Button variant="link" onClick={() => navigate("/")}>Back to Homepage</Button>
            </CardFooter>
          )}
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Enter your details, and once approved by your community admin, you'll get full access to your neighborhood's trusted providers.
        </div>
      </section>
    </main>
  );
};

export default Auth;