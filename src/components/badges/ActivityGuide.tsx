import { useState } from "react";
import { Share2, ArrowRight, Lightbulb, Check, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface Reward {
  activity: string;
  points: number;
  description?: string;
}

interface ActivityGuideProps {
  rewards: Reward[];
}

export default function ActivityGuide({ rewards }: ActivityGuideProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Please sign in to generate an invite link");
        return;
      }

      const { data, error } = await supabase
        .from('simple_invites')
        .insert({
          inviter_email: user.email,
          invite_url: crypto.randomUUID()
        })
        .select()
        .single();

      if (error) throw error;

      const baseUrl = window.location.origin;
      const fullInviteUrl = `${baseUrl}/invite/${data.invite_url}`;
      
      setInviteUrl(fullInviteUrl);
      setShowModal(true);
      
      toast.success('Invite link generated! You\'ll earn 10 points when your neighbor joins! That\'s halfway to your free Starbucks! ☕', {
        duration: 5000,
        description: 'Share this link with your neighbor and earn 10 points when they join! That\'s halfway to your free Starbucks! ☕'
      });
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error('Failed to generate invite link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link. Please copy manually.');
    }
  };

  const activities = [
    {
      type: "invite_neighbor",
      title: "Invite a Neighbor", 
      description: "Invite someone from your community to join",
      points: rewards.find(r => r.activity === "invite_neighbor")?.points || 10,
      action: generateInvite,
      buttonText: "Invite",
      buttonIcon: <Share2 className="w-3 h-3" />
    },
    {
      type: "rate_vendor", 
      title: "Rate a Vendor",
      description: "Share your experience with a vendor (unique per vendor)",
      points: rewards.find(r => r.activity === "rate_vendor")?.points || 5,
      action: () => navigate("/communities/boca-bridges"),
      buttonText: "Rate",
      buttonIcon: <ArrowRight className="w-3 h-3" />
    },
    {
      type: "vendor_submission",
      title: "Submit a New Vendor",
      description: "Add a new service provider to help your community",
      points: rewards.find(r => r.activity === "vendor_submission")?.points || 5,
      action: () => navigate("/submit?community=Boca%20Bridges"),
      buttonText: "Add",
      buttonIcon: <ArrowRight className="w-3 h-3" />
    }
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-4 h-4" />
            How to Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? "px-4 pb-6 space-y-4" : "space-y-4"}>
          {activities.map((activity) => (
            <div 
              key={activity.type} 
              className={`
                border rounded-lg
                ${isMobile 
                  ? 'p-4 space-y-3' 
                  : 'p-4 flex items-center justify-between'
                }
              `}
            >
              {isMobile ? (
                // Mobile Layout - Stacked
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-base">{activity.title}</h4>
                    </div>
                    <span className="ml-3 text-sm font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      +{activity.points} pts
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  
                  <Button 
                    onClick={activity.action}
                    size="sm"
                    disabled={activity.type === "invite_neighbor" && loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
                  >
                    {activity.type === "invite_neighbor" && loading ? (
                      'Generating...'
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {activity.buttonIcon}
                        {activity.buttonText}
                      </span>
                    )}
                  </Button>
                </>
              ) : (
                // Desktop Layout - Horizontal
                <>
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
                    disabled={activity.type === "invite_neighbor" && loading}
                    className="ml-4 flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
                  >
                    {activity.type === "invite_neighbor" && loading ? (
                      'Generating...'
                    ) : (
                      <>
                        {activity.buttonIcon}
                        {activity.buttonText}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Invite Neighbors to Earn 10 Points!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with your neighbor and earn 10 points when they join - that's halfway to your free Starbucks! ☕
            </p>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <input
                  className="px-3 py-2 text-sm border rounded-md bg-muted"
                  value={inviteUrl}
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