import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lightbulb, ArrowRight, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePointRewards } from "@/hooks/usePointRewards";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserData } from "@/hooks/useUserData";
import { useState } from "react";

export default function ActivityGuide() {
  const navigate = useNavigate();
  const { data: rewards = [] } = usePointRewards();
  const { toast } = useToast();
  const { data: userData } = useUserData();
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback to older method
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  };

  const generateInvite = async () => {
    if (!userData?.isAuthenticated) return;
    try {
      setIsInviting(true);
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error("Not authenticated");
      
      const token = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      
      // Get user's community information
      const { data: userProfile } = await supabase
        .from('users')
        .select('address')
        .eq('id', userId)
        .single();
      
      let communitySlug = null;
      let communityName = null;
      
      if (userProfile?.address) {
        const { data: hoaData } = await supabase
          .from('household_hoa')
          .select('hoa_name')
          .eq('normalized_address', userProfile.address)
          .single();
        
        if (hoaData?.hoa_name) {
          communityName = hoaData.hoa_name;
          communitySlug = hoaData.hoa_name.toLowerCase().replace(/\s+/g, '-');
        }
      }
      
      // Generate a random 8-character code and use simple_invites table
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from("simple_invites")
        .insert({ 
          code: inviteCode,
          inviter_id: userId
        });
      
      if (error) throw error;
      
      const link = communitySlug 
        ? `${window.location.origin}/communities/${communitySlug}?invite=${inviteCode}&welcome=true`
        : `${window.location.origin}/invite/${inviteCode}`;
      setInviteLink(link);
      
      // Try to copy automatically
      const copySuccess = await copyToClipboard(link);
      if (copySuccess) {
        toast({ 
          title: "Invite link copied!", 
          description: "Share it with your neighbor." 
        });
      } else {
        // Show modal if copy failed
        setShowInviteModal(true);
      }
    } catch (e: any) {
      console.error("[ActivityGuide] invite error:", e);
      toast({ 
        title: "Could not create invite", 
        description: e?.message ?? "Unknown error", 
        variant: "destructive" 
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleModalCopy = async () => {
    const copySuccess = await copyToClipboard(inviteLink);
    if (copySuccess) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ 
        title: "Invite link copied!", 
        description: "Share it with your neighbor." 
      });
    }
  };

  const activities = [
    {
      type: "rate_vendor", 
      title: "Rate a Vendor",
      description: "Share your experience with a vendor (unique per vendor)",
      points: rewards.find(r => r.activity === "rate_vendor")?.points || 5,
      action: () => navigate("/communities/boca-bridges"),
      buttonText: "Rate Vendors"
    },
    {
      type: "vendor_submission",
      title: "Submit a New Vendor",
      description: "Add a new service provider to help your community",
      points: rewards.find(r => r.activity === "vendor_submission")?.points || 5,
      action: () => navigate("/submit?community=Boca%20Bridges"),
      buttonText: "Add Vendor"
    },
    {
      type: "invite_neighbor",
      title: "Invite a Neighbor", 
      description: "Invite someone from your community to join",
      points: rewards.find(r => r.activity === "invite_neighbor")?.points || 10,
      action: generateInvite,
      buttonText: isInviting ? "Generating..." : "Send Invite"
    }
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            How to Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.type} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{activity.title}</h4>
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    +{activity.points} pts
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
              </div>
              <Button 
                onClick={activity.action}
                size="sm"
                variant="outline"
                className="ml-4 flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
              >
                {activity.buttonText}
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {userData?.communityName 
                ? `Share Courtney's List to ${userData.communityName} Neighbors`
                : "Share Courtney's List"
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this link and share it with your neighbor:
            </p>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <input
                  className="px-3 py-2 text-sm border rounded-md bg-muted"
                  value={inviteLink}
                  readOnly
                />
              </div>
              <Button size="sm" onClick={handleModalCopy}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}