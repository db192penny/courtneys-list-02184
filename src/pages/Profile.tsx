import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useBadgeLevels, getUserCurrentBadge, getUserNextBadge } from "@/hooks/useBadgeLevels";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import UserBadge from "@/components/badges/UserBadge";
import AdminBadge from "@/components/badges/AdminBadge";
import BadgeProgress from "@/components/badges/BadgeProgress";
import PointHistoryTable from "@/components/badges/PointHistoryTable";
import ActivityGuide from "@/components/badges/ActivityGuide";
import BadgeLevelChart from "@/components/badges/BadgeLevelChart";
import AddressChangeRequestModal from "@/components/profile/AddressChangeRequestModal";
import { SimpleInvite } from "@/components/SimpleInvite";


const Profile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showAddressChangeModal, setShowAddressChangeModal] = useState(false);

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

    const payload = {
      id: auth.user.id,
      email: auth.user.email ?? "", // required by DB/types
      name: name.trim(),
    };

    const { error } = await supabase.from("users").update({ name: name.trim() }).eq("id", auth.user.id);
    if (error) {
      console.error("[Profile] save error:", error);
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Your profile was updated." });
  };

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const handleRequestAddressChange = () => {
    setShowAddressChangeModal(true);
  };

  const handleAddressChangeSuccess = () => {
    toast({
      title: "Request submitted",
      description: "Your address change request has been submitted for admin review.",
    });
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
                <Label htmlFor="address">Current Address</Label>
                <div className="p-3 bg-muted rounded-md text-sm min-h-[40px] flex items-center">
                  {address || "No address on file"}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleRequestAddressChange}
                  className="mt-2"
                >
                  Request Address Change
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={loading}>Save</Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* Activity Insights Section */}
        <div className="mt-8 space-y-6">
          <SimpleInvite />
          <ActivityGuide />
          <BadgeLevelChart currentPoints={points} />
        </div>
        
        <div className="mt-6 text-sm text-muted-foreground">
          Your address is used for community verification. Only your street name may be shown publicly.
          Address changes require admin approval to maintain data integrity.
        </div>
        
        {/* Point History Section - Moved to Bottom */}
        <div className="mt-8">
          <PointHistoryTable />
        </div>

        {/* Address Change Request Modal */}
        <AddressChangeRequestModal
          open={showAddressChangeModal}
          onOpenChange={setShowAddressChangeModal}
          currentAddress={address}
          onSuccess={handleAddressChangeSuccess}
        />

      </section>
    </main>
  );
};

export default Profile;
