import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, Crown, PartyPopper, ArrowLeft, Mail, AlertTriangle } from "lucide-react";
import { handleSignupInvite } from '@/lib/handle-signup-invite';
import { MagicLinkLoader } from "@/components/MagicLinkLoader";

const Auth = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [resident, setResident] = useState<"yes" | "no">("yes");
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean; address?: boolean; resident?: boolean }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [detectedCommunity, setDetectedCommunity] = useState<string>("");
  const [justSignedUp, setJustSignedUp] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const hasMagicLink = window.location.hash.includes('access_token=');

  const communityName = useMemo(() => {
    const urlCommunity = params.get("community") || "";
    return urlCommunity;
  }, [params]);


  const isVerifiedMagicLink = useMemo(() => {
    return params.get("verified") === "true";
  }, [params]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const fallbackUrl = communityName 
        ? `/communities/${toSlug(communityName)}`
        : "/communities/boca-bridges";
      navigate(fallbackUrl);
    }
  };

  useEffect(() => {
    const addrParam = (params.get("address") || "").trim();
    if (!address && addrParam) {
      setAddress(addrParam);
    }
  }, [email, address, params]);

  const finalizeOnboarding = useCallback(async (userId: string, userEmail: string | null) => {
    console.log('🎯 [finalizeOnboarding] CALLED with userId:', userId, 'userEmail:', userEmail);
    let destination = "/communities/boca-bridges?welcome=true";
    
    // Handle signup invite processing
    if (userId) {
      console.log('🎯 [finalizeOnboarding] About to call handleSignupInvite');
      try {
        await handleSignupInvite(userId);
        console.log('🎯 [finalizeOnboarding] Invite processing completed');
      } catch (error) {
        console.error('🎯 [finalizeOnboarding] Error processing invite:', error);
      }
    }
    
    try {
      if (communityName) {
        destination = `/communities/${toSlug(communityName)}?welcome=true`;
      } else {
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("address, signup_source")
          .eq("id", userId)
          .maybeSingle();

        if (!userErr && userData) {
          if (userData?.signup_source && userData.signup_source.startsWith("community:")) {
            const communityFromSignup = userData.signup_source.replace("community:", "");
            destination = `/communities/${toSlug(communityFromSignup)}?welcome=true`;
          } else if (userData?.address && userData.address !== "Address Not Provided") {
            const { data: normalizedAddr } = await supabase.rpc("normalize_address", { _addr: userData.address });
            
            const { data: mapping } = await supabase
              .from("household_hoa")
              .select("hoa_name, created_at, household_address")
              .eq("household_address", normalizedAddr)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const hoaName = mapping?.hoa_name || "";
            if (hoaName) {
              destination = `/communities/${toSlug(hoaName)}?welcome=true`;
            } else {
              try {
                const { data: hoaRes } = await supabase.rpc("get_my_hoa");
                const rpcHoa = (hoaRes?.[0]?.hoa_name as string | undefined) || "";
                if (rpcHoa) {
                  destination = `/communities/${toSlug(rpcHoa)}?welcome=true`;
                }
              } catch (e) {
                // Silent fallback
              }
            }
          }
        }
      }

      const cleanDestination = destination.split('#')[0];
      
      if (destination !== "/communities/boca-bridges?welcome=true") {
        const communityMatch = destination.match(/\/communities\/(.+)/);
        const communityForDisplay = communityMatch 
          ? communityMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : communityName || "your community";
        
        setDetectedCommunity(communityForDisplay);
        setShowSuccessModal(true);
        
        setTimeout(() => {
          navigate(cleanDestination, { replace: true });
        }, 100);
        return;
      }
      
      navigate(cleanDestination, { replace: true });
      
    } catch (e) {
      toast({ 
        title: "Navigation Issue", 
        description: "We're completing your signup. Please wait a moment.", 
        variant: "destructive" 
      });
      
      navigate("/communities/boca-bridges?welcome=true", { replace: true });
    }
  }, [navigate, toast, communityName]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [Auth State Change] Event:', event, 'Session:', session?.user?.email);
      console.log('🔄 [Auth Debug] Session exists:', !!session, 'isVerifiedMagicLink:', isVerifiedMagicLink);
      
      // Check localStorage invite data
      console.log('📦 [Auth] Current localStorage:', {
        invite_code: localStorage.getItem('pending_invite_code'),
        inviter_id: localStorage.getItem('pending_inviter_id')
      });
      
      if (event === 'SIGNED_IN') {
        console.log('✅ [Auth] SIGNED_IN event detected');
      }
      
      if (session?.user) {
        console.log('🔄 [Auth Debug] About to call finalizeOnboarding for user:', session.user.id);
        if (isVerifiedMagicLink || session?.user) {
          setTimeout(() => finalizeOnboarding(session.user!.id, session.user!.email ?? null), 0);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 [Auth Debug] Initial session check:', !!session, 'User:', session?.user?.email);
      if (session?.user) {
        console.log('🔄 [Auth Debug] Calling finalizeOnboarding from initial session check');
        if (isVerifiedMagicLink || session?.user) {
          finalizeOnboarding(session.user.id, session.user.email ?? null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [finalizeOnboarding, isVerifiedMagicLink, justSignedUp]);


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

    localStorage.removeItem("prefill_address");
    localStorage.removeItem("selected_community");
    
    const targetEmail = email.trim().toLowerCase();
    
    try {
      const { data: emailStatus, error: statusError } = await supabase.rpc("get_email_status", {
        _email: targetEmail,
      });

      if (statusError) {
        toast({ 
          title: "Account check failed", 
          description: "Unable to verify email status. Please try again.", 
          variant: "destructive" 
        });
        return;
      }

      if (emailStatus === "approved") {
        toast({
          title: "Account already exists",
          description: "An account with this email is already active. Please sign in instead.",
          variant: "destructive",
        });
        
        const signInUrl = communityName 
          ? `/signin?community=${toSlug(communityName)}` 
          : "/signin";
        navigate(signInUrl);
        return;
      } else if (emailStatus === "pending") {
        toast({
          title: "Account pending approval",
          description: "Your account is already registered but still under review. Please check back later.",
          variant: "destructive",
        });
        return;
      }
      
    } catch (emailCheckError) {
      // Continue with signup attempt if email check fails
    }

    const metaData = {
      name: name.trim(),
      address: address.trim(),
      street_name: extractStreetName(address.trim()),
      signup_source: communityName ? `community:${toSlug(communityName)}` : null,
    };

    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const redirectUrl = `${window.location.origin}/auth`;
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: targetEmail,
      password: tempPassword,
      options: { 
        emailRedirectTo: redirectUrl,
        data: metaData
      },
    });

    if (signUpError) {
      let errorTitle = "Could not create account";
      let errorDescription = signUpError.message;
      
      if (signUpError.message.includes("User already registered") || 
          signUpError.message.includes("already been taken") ||
          signUpError.message.includes("already exists") ||
          signUpError.message.includes("duplicate key") ||
          signUpError.message.includes("unique constraint")) {
        errorTitle = "Email already registered";
        errorDescription = "This email is already registered. Please sign in instead or contact support if you think this is an error.";
        
        setTimeout(() => {
          const signInUrl = communityName 
            ? `/signin?community=${toSlug(communityName)}` 
            : "/signin";
          navigate(signInUrl);
        }, 2000);
        
      } else if (signUpError.message.includes("invalid email")) {
        errorTitle = "Invalid email";
        errorDescription = "Please enter a valid email address.";
      } else if (signUpError.message.includes("password")) {
        errorTitle = "Password issue";
        errorDescription = "There was an issue with the password. Please try again.";
      }
      
      toast({ 
        title: errorTitle, 
        description: errorDescription, 
        variant: "destructive" 
      });
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      toast({ title: "Signup failed", description: "Could not create user account", variant: "destructive" });
      return;
    }

    try {
      await supabase.functions.invoke('send-admin-notification', {
        body: {
          userEmail: targetEmail,
          userName: name.trim(),
          userAddress: address.trim(),
          community: communityName || 'Direct Signup',
          signupSource: communityName ? `community:${toSlug(communityName)}` : 'direct'
        }
      });
    } catch (adminNotificationError) {
      // Don't fail the signup process if admin notification fails
    }
    
    setShowMagicLinkModal(true);
  };

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return hasMagicLink ? (
    <MagicLinkLoader />
  ) : (
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

                <div className="pt-2 text-center">
                  <Link 
                    to={communityName ? `/signin?community=${toSlug(communityName)}` : "/signin"} 
                    className="underline underline-offset-4 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Already have an account? Sign In
                  </Link>
                </div>
              </form>
            </CardContent>

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

      <Dialog open={showMagicLinkModal} onOpenChange={(open) => {
        setShowMagicLinkModal(open);
        if (!open) {
          setJustSignedUp(false);
        }
      }}>
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
              <Button onClick={() => {
                setShowMagicLinkModal(false);
                setJustSignedUp(false);
              }} className="w-full">
                Got It!
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowMagicLinkModal(false);
                  setJustSignedUp(false);
                  onSubmit(new Event('submit') as any);
                }}
                className="w-full"
              >
                Resend Magic Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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