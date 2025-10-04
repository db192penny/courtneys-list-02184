import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { extractStreetName } from "@/utils/address";
import SEO from "@/components/SEO";
import { toSlug } from "@/utils/slug";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

const CompleteProfile = () => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [resident, setResident] = useState<"yes" | "no">("yes");
  const [errors, setErrors] = useState<{ name?: boolean; address?: boolean; resident?: boolean }>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getCommunityDisplayName = (slug: string): string => {
    const normalized = slug.toLowerCase();
    if (normalized === 'the-bridges' || normalized === 'bridges') {
      return 'The Bridges';
    }
    if (normalized === 'boca-bridges') {
      return 'Boca Bridges';
    }
    // Default formatting for other communities
    return slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const communitySlug = searchParams.get("community") || "the-bridges";
  const communityName = getCommunityDisplayName(communitySlug);

  useEffect(() => {
    // Check if user is authenticated and pre-fill name from Google
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }

      // Pre-fill name from Google metadata
      const googleName = session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || "";
      if (googleName) {
        setName(googleName);
      }
    };
    checkAuth();
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (resident === "no") {
      toast({ 
        title: "Residents only", 
        description: "Currently, access is restricted to residents only.", 
        variant: "destructive" 
      });
      return;
    }

    const fieldErrors = {
      name: !name.trim(),
      address: !address.trim() || !/^\d+/.test(address.trim()),
      resident: !resident,
    };

    const missingKeys = (Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>).filter((k) => fieldErrors[k]);
    if (missingKeys.length > 0) {
      setErrors(fieldErrors);
      
      // Show specific error for missing street number
      if (!address.trim()) {
        toast({
          title: "Incomplete form",
          description: "Please enter your address",
          variant: "destructive",
        });
      } else if (!/^\d+/.test(address.trim())) {
        toast({
          title: "Invalid address",
          description: "Your address must include a house or unit number",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Incomplete form",
          description: "Please complete all required fields",
          variant: "destructive",
        });
      }
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", description: "Please sign in again", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const streetName = extractStreetName(address.trim());

      // UPSERT user profile - creates record for Google OAuth users or updates existing
      const { error: upsertError } = await supabase
        .from("users")
        .upsert({
          id: user.id,
          email: user.email,
          name: name.trim(),
          address: address.trim(),
          street_name: streetName,
          is_verified: true, // Auto-approve Google sign-ups
          signup_source: `community:${communitySlug}`,
          points: 5,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.error("Profile upsert error:", upsertError);
        toast({ 
          title: "Update failed", 
          description: "Could not update your profile. Please try again.", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // Log the signup bonus points to history
      // This is needed because Google OAuth bypasses the normal trigger
      const { error: pointHistoryError } = await supabase
        .from("user_point_history")
        .insert({
          user_id: user.id,
          activity_type: 'join_site',
          points_earned: 5,
          description: 'Welcome bonus for joining Courtney\'s List'
        });

      if (pointHistoryError) {
        console.error('Failed to log signup points:', pointHistoryError);
        // Don't block the flow - user creation was successful
      }

      // Create household-HOA mapping
      try {
        const { data: normalizedAddr } = await supabase.rpc("normalize_address", { 
          _addr: address.trim() 
        });
        
        await supabase
          .from("household_hoa")
          .insert({
            household_address: address.trim(),
            normalized_address: normalizedAddr || address.trim(),
            hoa_name: communityName,
            created_by: user.id,
            mapping_source: 'google_oauth'
          });
      } catch (mappingError) {
        console.error("Mapping creation error:", mappingError);
        // Don't fail the whole process if mapping fails
      }

      // Send admin notification for Google OAuth signup
      try {
        const displayCommunity = communityName === "The Bridges" ? "The Bridges" : communityName;
        
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            userEmail: user.email,
            userName: name.trim(),
            userAddress: address.trim(),
            community: displayCommunity,
            signupSource: `google_oauth:${communitySlug}`
          }
        });
        
        console.log('Admin notification sent for Google OAuth signup');
      } catch (notificationError) {
        console.error('Failed to send admin notification:', notificationError);
        // Don't fail the signup if notification fails
      }

      toast({
        title: "Profile completed!",
        description: `Welcome to ${communityName}`,
      });

      // Redirect to their community
      navigate(`/communities/${toSlug(communityName)}?welcome=true`, { replace: true });

    } catch (error) {
      console.error("Complete profile error:", error);
      toast({ 
        title: "Error", 
        description: "Something went wrong. Please try again.", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={`Complete Your Profile - ${communityName}`}
        description="Complete your profile to access exclusive vendor information"
      />
      
      <section className="container max-w-xl py-4 sm:py-6 px-4 sm:px-6">
        <h1 className="text-3xl font-semibold mb-4 sm:mb-6">Complete Your Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {communityName}!</CardTitle>
            <CardDescription>
              We just need a bit more information to get you started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-foreground" aria-hidden>*</span>
                </Label>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="address">
                    Full Address <span className="text-foreground" aria-hidden>*</span>
                  </Label>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          aria-label="Why we need your address" 
                          className="text-muted-foreground"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your address helps us link you with your community's exclusive vendor info</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please ensure your full address includes your house/building number
                </p>
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
                <Label htmlFor="resident">
                  Are you a resident? <span className="text-foreground" aria-hidden>*</span>
                </Label>
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

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Completing..." : "Complete Profile"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">* Required fields</p>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default CompleteProfile;
