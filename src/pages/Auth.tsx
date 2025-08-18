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
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Info, Crown, PartyPopper, ArrowLeft } from "lucide-react";

const Auth = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [resident, setResident] = useState<"yes" | "no">("yes");
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean; address?: boolean; resident?: boolean }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [detectedCommunity, setDetectedCommunity] = useState<string>("");
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

  const isVerifiedMagicLink = useMemo(() => {
    return params.get("verified") === "true";
  }, [params]);

  const handleBack = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to community page or home
      const fallbackUrl = communityName 
        ? `/communities/${toSlug(communityName)}`
        : "/communities/boca-bridges";
      navigate(fallbackUrl);
    }
  };

  useEffect(() => {
    // Only pre-fill email if there's a valid invite token context
    const hint = localStorage.getItem("invite_email");
    if (hint && !email && inviteToken) {
      // Validate that the stored email is for a current valid invite
      const validateAndSetEmail = async () => {
        try {
          const { data } = await supabase.rpc("validate_invite", { _token: inviteToken });
          // Handle the response structure - data is an array from the RPC
          const inviteData = Array.isArray(data) && data.length > 0 ? data[0] : null;
          if (inviteData && inviteData.invited_email === hint) {
            setEmail(hint);
          } else {
            // Clear outdated email hint
            localStorage.removeItem("invite_email");
          }
        } catch (error) {
          console.warn("Could not validate invite token, clearing stored email");
          localStorage.removeItem("invite_email");
        }
      };
      validateAndSetEmail();
    } else if (hint && !inviteToken) {
      // Clear stored email if there's no invite context
      localStorage.removeItem("invite_email");
    }

    const addrParam = (params.get("address") || "").trim();
    const storedAddr = localStorage.getItem("prefill_address") || "";
    if (!address && (addrParam || storedAddr)) {
      setAddress(addrParam || storedAddr);
    }
  }, [email, address, params, inviteToken]);

  const finalizeOnboarding = useCallback(async (userId: string, userEmail: string | null) => {
    console.log("[Auth] 🚀 Starting finalizeOnboarding for user:", userId);
    
    let retryCount = 0;
    const maxRetries = 3;
    let destination = "/communities/boca-bridges?welcome=true";
    
    // Enhanced error tracking
    const errorTracker = {
      pending_profile_missing: false,
      upsert_failed: false,
      community_detection_failed: false,
      navigation_failed: false
    };

    const executeWithRetry = async (operation: () => Promise<void>, operationName: string) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await operation();
          return;
        } catch (error) {
          console.warn(`[Auth] ${operationName} attempt ${attempt} failed:`, error);
          if (attempt === maxRetries) {
            throw error;
          }
          // Progressive delay: 500ms, 1s, 1.5s
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    };

    try {
      // STEP 1: Handle pending profile data with fallback mechanisms
      const pendingRaw = localStorage.getItem("pending_profile");
      let pending: null | { name: string; email: string; address: string; street_name?: string; signup_source?: string } = null;
      
      if (pendingRaw) {
        try {
          pending = JSON.parse(pendingRaw);
          console.log("[Auth] ✅ Found pending profile data:", { 
            name: pending?.name, 
            email: pending?.email, 
            hasAddress: !!pending?.address 
          });
        } catch (parseError) {
          console.error("[Auth] ❌ Failed to parse pending_profile:", parseError);
          errorTracker.pending_profile_missing = true;
        }
      } else {
        console.warn("[Auth] ⚠️ No pending_profile found in localStorage");
        errorTracker.pending_profile_missing = true;
      }

      // STEP 2: Check existing user data to avoid overwriting valid profiles
      if (!pending) {
        console.log("[Auth] 🔍 No pending data, checking existing user profile...");
        
        // Check if user already has valid profile data
        const { data: existingUser, error: existingUserError } = await supabase
          .from("users")
          .select("name, address, signup_source")
          .eq("id", userId)
          .maybeSingle();
        
        if (existingUserError) {
          console.warn("[Auth] ⚠️ Error checking existing user:", existingUserError);
        }
        
        // Only use fallback recovery for truly orphaned users (with placeholder data)
        const isOrphanedUser = existingUser && 
          existingUser.signup_source === "fallback_recovery" &&
          existingUser.name === "Unknown User" &&
          existingUser.address === "Address Not Provided";
        
        if (!existingUser || isOrphanedUser) {
          console.log("[Auth] 🔧 Using fallback data for genuinely orphaned user...");
          const fallbackName = sessionStorage.getItem("signup_name") || "Unknown User";
          const fallbackEmail = userEmail || sessionStorage.getItem("signup_email") || "unknown@example.com";
          const fallbackAddress = sessionStorage.getItem("signup_address") || "Address Not Provided";
          
          pending = {
            name: fallbackName,
            email: fallbackEmail,
            address: fallbackAddress,
            street_name: extractStreetName(fallbackAddress),
            signup_source: "fallback_recovery"
          };
          
          console.log("[Auth] 🔧 Using fallback data:", { 
            name: pending.name, 
            email: pending.email, 
            hasAddress: !!pending.address 
          });
        } else {
          console.log("[Auth] ✅ User has valid profile data, skipping fallback recovery");
          // User has valid data, skip the upsert and proceed to community detection
          pending = null;
        }
      }

      // STEP 3: Upsert user data with retry logic
      if (pending) {
        await executeWithRetry(async () => {
          const payload = {
            id: userId,
            email: userEmail || pending.email,
            name: pending.name,
            address: pending.address,
            street_name: pending.street_name || extractStreetName(pending.address),
            signup_source: (pending as any).signup_source || null,
            is_verified: true, // Auto-verify since they completed auth flow
            show_name_public: true, // Default to showing name in reviews/costs
          };
          
          console.log("[Auth] 📝 Upserting user data:", { 
            id: payload.id, 
            email: payload.email, 
            name: payload.name, 
            signup_source: payload.signup_source 
          });
          
          const { error: upsertError } = await supabase.from("users").upsert(payload);
          if (upsertError) {
            console.error("[Auth] ❌ Users upsert error:", upsertError);
            errorTracker.upsert_failed = true;
            throw upsertError;
          }
          
          console.log("[Auth] ✅ User data upserted successfully");
        }, "user upsert");

        // STEP 4: Handle invite token acceptance
        const token = localStorage.getItem("invite_token") || inviteToken;
        if (token) {
          try {
            const { error: markErr } = await supabase.rpc("mark_invite_accepted", {
              _token: token,
              _user_id: userId,
            });
            if (markErr) {
              console.warn("[Auth] ⚠️ mark_invite_accepted error (non-fatal):", markErr);
            } else {
              console.log("[Auth] ✅ Invite token marked as accepted");
            }
          } catch (inviteError) {
            console.warn("[Auth] ⚠️ Invite processing failed (non-fatal):", inviteError);
          }
        }

        // Clean up localStorage
        localStorage.removeItem("pending_profile");
        console.log("[Auth] 🧹 Cleaned up pending_profile from localStorage");
      }

      // STEP 5: Community detection with enhanced error handling
      console.log("[Auth] 🔍 Starting community detection for user:", userId);
      
      try {
        // PRIORITY 0: Check URL params for community context first
        if (communityName) {
          destination = `/communities/${toSlug(communityName)}?welcome=true`;
          console.log("[Auth] ✅ Community detected from URL params, redirecting to:", destination);
          // For verified magic link users, skip database detection and redirect immediately
          if (isVerifiedMagicLink) {
            console.log("[Auth] ✅ Verified magic link user, redirecting immediately");
            setTimeout(() => navigate(destination, { replace: true }), 100);
            return;
          }
        } else {
          // PRIORITY 1: Check signup_source for community affiliation
          const { data: userData, error: userErr } = await supabase
            .from("users")
            .select("address, signup_source")
            .eq("id", userId)
            .maybeSingle();

          if (userErr) {
            console.warn("[Auth] ⚠️ User lookup error:", userErr);
            throw userErr;
          }

          console.log("[Auth] 📍 User data retrieved:", { 
            address: userData?.address, 
            signup_source: userData?.signup_source 
          });

          // Check if user signed up from a community page
          if (userData?.signup_source && userData.signup_source.startsWith("community:")) {
            const communityFromSignup = userData.signup_source.replace("community:", "");
            destination = `/communities/${toSlug(communityFromSignup)}?welcome=true`;
            console.log("[Auth] ✅ Community detected from signup_source, redirecting to:", destination);
          } else if (userData?.address && userData.address !== "Address Not Provided") {
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
              console.warn("[Auth] ⚠️ household_hoa lookup error (non-fatal):", mapErr);
            }

            console.log("[Auth] 🏘️ HOA mapping found:", mapping);

            const hoaName = mapping?.hoa_name || "";
            if (hoaName) {
              destination = `/communities/${toSlug(hoaName)}?welcome=true`;
              console.log("[Auth] ✅ Community detected via address, redirecting to:", destination);
            } else {
              console.log("[Auth] ⚠️ No HOA mapping found, trying RPC fallback");
              // try RPC as additional fallback if available
              try {
                const { data: hoaRes } = await supabase.rpc("get_my_hoa");
                const rpcHoa = (hoaRes?.[0]?.hoa_name as string | undefined) || "";
                console.log("[Auth] 🔧 RPC result:", rpcHoa);
                if (rpcHoa) {
                  destination = `/communities/${toSlug(rpcHoa)}?welcome=true`;
                  console.log("[Auth] ✅ Community detected via RPC, redirecting to:", destination);
                }
              } catch (e) {
                console.warn("[Auth] ⚠️ get_my_hoa failed (non-fatal):", e);
              }
            }
          }
        }
      } catch (e) {
        console.warn("[Auth] ⚠️ Community detection failed (non-fatal):", e);
        errorTracker.community_detection_failed = true;
      }

      // STEP 6: Navigate with success notification
      const cleanDestination = destination.split('#')[0];
      console.log("[Auth] 🎯 Navigating to final destination:", cleanDestination);
      
      // Show success modal for successful onboarding
      if (destination !== "/communities/boca-bridges?welcome=true") {
        // Extract community name from destination for personalized message
        const communityMatch = destination.match(/\/communities\/(.+)/);
        const communityForDisplay = communityMatch 
          ? communityMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : communityName || "your community";
        
        setDetectedCommunity(communityForDisplay);
        setShowSuccessModal(true);
        
        // Delay navigation to show the modal
        setTimeout(() => {
          navigate(cleanDestination, { replace: true });
        }, 100);
        return;
      }
      
      navigate(cleanDestination, { replace: true });
      
    } catch (e) {
      console.error("[Auth] ❌ finalizeOnboarding failed with error:", e);
      console.error("[Auth] 📊 Error tracking:", errorTracker);
      
      // Show user-friendly error message
      toast({ 
        title: "Onboarding Issue", 
        description: "We're completing your signup. If this persists, please contact support.", 
        variant: "destructive" 
      });
      
      // Always ensure the user can access the app, even with partial failures
      navigate("/communities/boca-bridges?welcome=true&error=signup_incomplete", { replace: true });
    }
  }, [inviteToken, navigate, toast, communityName]);

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
    
    // Store in multiple locations for redundancy
    localStorage.setItem("pending_profile", JSON.stringify(pending));
    sessionStorage.setItem("signup_name", pending.name);
    sessionStorage.setItem("signup_email", pending.email);
    sessionStorage.setItem("signup_address", pending.address);
    
    if (inviteToken) {
      localStorage.setItem("invite_token", inviteToken);
      // Only store email if it's associated with a valid invite
      localStorage.setItem("invite_email", email.trim());
    } else {
      // Clear any stored invite email if there's no invite context
      localStorage.removeItem("invite_email");
    }
    
    console.log("[Auth] 💾 Stored signup data with redundancy:", { 
      name: pending.name, 
      email: pending.email, 
      hasAddress: !!pending.address,
      signup_source: pending.signup_source 
    });

    // Generate a temporary password the user never sees
    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: tempPassword,
    });

    if (error) {
      console.error("[Auth] signup error:", error);
      toast({ title: "Could not create account", description: error.message, variant: "destructive" });
      return;
    }

    // Since email confirmation is disabled, user is immediately authenticated
    // The onAuthStateChange listener will handle the rest
  };

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={communityName ? `Join ${communityName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : "Join Courtney's List"}
        description="Join the invite only test family - automatically verified access to exclusive vendor info."
        canonical={canonical}
      />
      <section className="container max-w-xl py-10">
        <h1 className="text-3xl font-semibold mb-6">{communityName ? `Join ${communityName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : "Join Courtney's List"}</h1>
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Request Access</CardTitle>
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
            
            {/* Highlighted Invite-Only Test Family Message */}
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Since you're part of the <strong>invite-only test group</strong> (thanks!), you'll be <strong>automatically verified</strong>. In the future, neighbors will need admin approval (that'll be me—unless one of you volunteers :)).
                </p>
              </div>
            </div>
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
                        <p>Your address helps us link you with your community's exclusive vendor info</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <AddressInput
                  id="address"
                  defaultValue={address}
                  placeholder="Full home address"
                  className={errors.address ? "border-destructive focus-visible:ring-destructive" : undefined}
                  onSelected={(addr: AddressSelectedPayload) => {
                    setAddress(addr.formatted_address);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resident">Are you a resident? <span className="text-foreground" aria-hidden>*</span></Label>
                <Select required value={resident} onValueChange={(v) => setResident(v as "yes" | "no")}>
                  <SelectTrigger id="resident" className={errors.resident ? "border-destructive" : undefined}>
                    <SelectValue placeholder="Select yes or no" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, I live here</SelectItem>
                    <SelectItem value="no">No, I'm not a resident</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Request Access
              </Button>
            </form>
          </CardContent>

          {/* TEMPORARY FALLBACK UI */}
          {resident === "no" && (
            <CardFooter className="pt-0">
              <p className="text-sm text-muted-foreground">
                Currently, access is restricted to residents only. We may expand to other users in the future.
              </p>
            </CardFooter>
          )}
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Enter your details, and once approved by your community admin, you'll get full access to your neighborhood's trusted providers.
        </div>
      </section>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-green-700 dark:text-green-400">
              Welcome to Your Community! 🎉
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-2">
              <p className="font-semibold">You've been successfully onboarded{detectedCommunity && ` to ${detectedCommunity}`}!</p>
              <p className="text-muted-foreground">
                Explore local vendors recommended by your neighbors and start discovering trusted services in your area.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction 
            onClick={() => {
              setShowSuccessModal(false);
              const cleanDestination = `/communities/${toSlug(detectedCommunity)}`.split('#')[0];
              navigate(cleanDestination, { replace: true });
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Start Exploring
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Auth;