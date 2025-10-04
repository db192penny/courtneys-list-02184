import { useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import AddressChangeRequestModal from "@/components/profile/AddressChangeRequestModal";
import { Settings as SettingsIcon, User, Home, LogOut } from "lucide-react";
import { useUserData } from "@/hooks/useUserData";

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showAddressChangeModal, setShowAddressChangeModal] = useState(false);
  const { data: userData, isLoading: loading } = useUserData();

  const [name, setName] = useState(userData?.name || "");

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { error } = await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", auth.user.id);
      
    if (error) {
      console.error("[Settings] save error:", error);
      toast({ 
        title: "Could not save", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Saved", 
        description: "Your settings have been updated." 
      });
    }
    
    setSaving(false);
  };

  const handleSignOut = async () => {
    // Get user's community before signing out
    let userCommunity = 'the-bridges'; // Default to The Bridges instead of Boca Bridges
    
    try {
      if (userData?.communityName) {
        const communityName = userData.communityName.toLowerCase();
        
        // Handle The Bridges specifically
        if (communityName.includes('the bridges') || communityName === 'the bridges') {
          userCommunity = 'the-bridges';
        } else if (communityName.includes('boca bridges')) {
          userCommunity = 'boca-bridges';
        } else {
          // For other communities, convert spaces to hyphens
          userCommunity = communityName.replace(/\s+/g, '-');
        }
      } else {
        // If no community data, try to detect from current URL
        const currentPath = window.location.pathname;
        if (currentPath.includes('/communities/the-bridges')) {
          userCommunity = 'the-bridges';
        } else if (currentPath.includes('/communities/boca-bridges')) {
          userCommunity = 'boca-bridges';
        }
      }
    } catch (error) {
      console.log('Using default community for sign-out redirect:', userCommunity);
    }
    
    await supabase.auth.signOut();
    navigate(`/signin?community=${userCommunity}`);
  };

  const handleRequestAddressChange = () => {
    setShowAddressChangeModal(true);
  };

  const handleAddressChangeSuccess = () => {
    toast({
      title: "Request submitted",
      description: "Your address change request has been submitted for admin review.",
    });
  };

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Settings — Courtney's List"
        description="Manage your account settings and personal information."
        canonical={canonical}
      />
      <section className="container max-w-2xl py-10">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-semibold">Settings</h1>
        </div>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <form onSubmit={onSave}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.currentTarget.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label>Community</Label>
                <div className="p-3 bg-muted rounded-md text-sm min-h-[40px] flex items-center">
                  {userData?.communityName || "No community assigned"}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Current Address</Label>
                <div className="p-3 bg-muted rounded-md text-sm min-h-[40px] flex items-center">
                  {userData?.address || "No address on file"}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleRequestAddressChange}
                  className="mt-2"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Request Address Change
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={loading || saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Account Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Preferences</Label>
              <p className="text-sm text-muted-foreground">
                Email notification settings will be available soon.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Privacy Settings</Label>
              <p className="text-sm text-muted-foreground">
                Privacy controls will be available soon.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardFooter>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Need Help?</Label>
              <p className="text-sm text-muted-foreground">
                Contact admin support or report an issue.
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-sm text-muted-foreground">
          Your address is used for community verification. Only your street name may be shown publicly.
          Address changes require admin approval to maintain data integrity.
        </div>

        {/* Address Change Request Modal */}
        <AddressChangeRequestModal
          open={showAddressChangeModal}
          onOpenChange={setShowAddressChangeModal}
          currentAddress={userData?.address || ""}
          onSuccess={handleAddressChangeSuccess}
        />
      </section>
    </main>
  );
};

export default Settings;