import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { extractStreetName } from "@/utils/address";
import { Link, useSearchParams } from "react-router-dom";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useBadgeLevels, getUserCurrentBadge, getUserNextBadge } from "@/hooks/useBadgeLevels";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import UserBadge from "@/components/badges/UserBadge";
import AdminBadge from "@/components/badges/AdminBadge";
import BadgeProgress from "@/components/badges/BadgeProgress";
import PointHistoryTable from "@/components/badges/PointHistoryTable";
import PointBreakdown from "@/components/badges/PointBreakdown";
import ActivityGuide from "@/components/badges/ActivityGuide";
import BadgeLevelChart from "@/components/badges/BadgeLevelChart";
import ProgressInsights from "@/components/badges/ProgressInsights";


const Profile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [points, setPoints] = useState<number>(0);
  const [params] = useSearchParams();
  const onboarding = params.get("onboarding");
  
  const { data: badgeLevels = [] } = useBadgeLevels();
  const { data: isAdmin = false } = useIsAdmin();
  
  const currentBadge = getUserCurrentBadge(points, badgeLevels);
  const nextBadge = getUserNextBadge(points, badgeLevels);
  

useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("name, address, points")
        .eq("id", auth.user.id)
        .single();

      if (error) {
        console.warn("[Profile] load error:", error);
      }
      if (!cancel) {
        setName(data?.name ?? "");
        setAddress(data?.address ?? "");
        setPoints(data?.points ?? 0);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const trimmedAddress = address.trim();
    const payload = {
      id: auth.user.id,
      email: auth.user.email ?? "", // required by DB/types
      name: name.trim(),
      address: trimmedAddress,
      street_name: extractStreetName(trimmedAddress), // required by DB/types
    };

    const { error } = await supabase.from("users").upsert(payload);
    if (error) {
      console.error("[Profile] save error:", error);
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Your profile and privacy settings were updated." });
  };

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const handleAddressSelected = async (payload: AddressSelectedPayload) => {
    // POST to backend (Supabase Edge Function)
    const { error } = await supabase.functions.invoke("household-address", {
      body: payload,
    });
    if (error) {
      console.error("[Profile] address save error:", error);
      toast({
        title: "Could not save address",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    // Optimistic/local refresh
    setAddress(payload.household_address);
    toast({ title: "Address saved", description: "Your household address was updated." });
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Profile & Privacy — Courtney's List"
        description="Manage your profile and privacy preferences."
        canonical={canonical}
      />
      <section className="container max-w-4xl py-10">
        <h1 className="text-3xl font-semibold mb-6">Your Profile</h1>
{onboarding && (
          <Alert className="mb-4">
            <AlertTitle>Welcome!</AlertTitle>
            <AlertDescription>
              Select or join your community to finish setup. You can request a new community if yours isn't listed.
              <br />
              <Link to="/communities/request" className="underline">Request a community</Link>
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Profile</CardTitle>
            <div className="flex flex-col gap-3 mt-3">
              <div className="flex items-center gap-3 flex-wrap">
                {currentBadge && (
                  <UserBadge
                    name={currentBadge.name}
                    color={currentBadge.color}
                    icon={currentBadge.icon}
                    size="lg"
                  />
                )}
                {isAdmin && <AdminBadge size="lg" />}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{points} Activity Points</span>
              </div>
              
              <BadgeProgress
                currentPoints={points}
                currentBadge={currentBadge}
                nextBadge={nextBadge}
              />
            </div>
          </CardHeader>
          <form onSubmit={onSave}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <AddressInput
                  id="address"
                  defaultValue={address}
                  onSelected={handleAddressSelected}
                  country={["us"]}
                  placeholder="Start typing your address..."
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={loading}>Save</Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* Point History and Insights Section */}
        <div className="mt-8 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <PointHistoryTable />
            <PointBreakdown />
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2">
            <ActivityGuide />
            <ProgressInsights currentPoints={points} />
          </div>
          
          <BadgeLevelChart currentPoints={points} />
        </div>
        
        <div className="mt-6 text-sm text-muted-foreground">
          Your address is used for community verification. Only your street name may be shown publicly.
        </div>

      </section>
    </main>
  );
};

export default Profile;
