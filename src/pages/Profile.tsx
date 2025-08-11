import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { extractStreetName } from "@/utils/address";
import { Link, useSearchParams } from "react-router-dom";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import useIsAdmin from "@/hooks/useIsAdmin";

const Profile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showNamePublic, setShowNamePublic] = useState(false);
  const [points, setPoints] = useState<number>(0);

  const [params] = useSearchParams();
  const onboarding = params.get("onboarding");
  const { data: isAdmin } = useIsAdmin();

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
        .select("name, address, is_anonymous, show_name_public, points")
        .eq("id", auth.user.id)
        .single();

      if (error) {
        console.warn("[Profile] load error:", error);
      }
      if (!cancel) {
        setName(data?.name ?? "");
        setAddress(data?.address ?? "");
        setIsAnonymous(data?.is_anonymous ?? true);
        setShowNamePublic(data?.show_name_public ?? false);
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
      is_anonymous: isAnonymous,
      show_name_public: showNamePublic,
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
        title="Courtney's List | Profile"
        description="Manage your profile and privacy preferences."
        canonical={canonical}
      />
      <section className="container max-w-xl py-10">
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
            <CardTitle className="text-base">Profile & Privacy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Activity points: {points}</p>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="is_anonymous" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                  <Label htmlFor="is_anonymous">Post as Anonymous</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="show_name_public" checked={showNamePublic} onCheckedChange={setShowNamePublic} />
                  <Label htmlFor="show_name_public">Show Name Publicly</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link to="/household" className="underline text-sm">Go to Household</Link>
              <Button type="submit" disabled={loading}>Save</Button>
            </CardFooter>
          </form>
        </Card>
        <div className="mt-4 text-sm text-muted-foreground">
          Your address is used for community verification. Only your street name may be shown publicly.
        </div>

        {isAdmin && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Admin Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button asChild>
                  <Link to="/admin">Open Admin Dashboard</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/submit">Submit Vendor</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
};

export default Profile;
