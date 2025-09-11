import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lightbulb, ArrowRight, Share2, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePointRewards } from "@/hooks/usePointRewards";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { User } from '@supabase/supabase-js';

export default function ActivityGuide() {
  const navigate = useNavigate();
  const { data: rewards = [] } = usePointRewards();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Invite functionality state
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
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
    if (!user) {
      toast({ 
        title: 'Please log in first', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error } = await supabase
        .from('simple_invites')
        .insert({ 
          code: code, 
          inviter_id: user.id 
        });

      if (error) throw error;

      const baseUrl = window.location.origin;
      // FIXED: Include inviter parameter in URL
      const url = `${baseUrl}/communities/boca-bridges?invite=${code}&inviter=${user.id}&welcome=true`;
      setInviteUrl(url);

      // Try to copy automatically
      const copySuccess = await copyToClipboard(url);
      if (copySuccess) {
        toast({ 
          title: '📋 Invite Link Copied!',
          description: 'Earn 10 points when your neighbor joins! That\'s halfway to your free Starbucks! ☕' 
        });
      } else {
        // Show modal if copy failed
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ 
        title: 'Failed to generate invite', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalCopy = async () => {
    const copySuccess = await copyToClipboard(inviteUrl);
    if (copySuccess) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ 
        title: '📋 Invite Link Copied!',
        description: 'Earn 10 points when your neighbor joins! That\'s halfway to your free Starbucks! ☕' 
      });
    }
  };

  const activities = [
    {
      type: "invite_neighbor",
      title: "Invite a Neighbor", 
      description: "Invite someone from your community to join",
      points: rewards.find(r => r.activity === "invite_neighbor")?.points || 10,
      action: generateInvite,
      buttonText: isMobile ? "Invite" : "Invite Neighbors"
    },
    {
      type: "rate_vendor", 
      title: "Rate a Vendor",
      description: "Share your experience with a vendor (unique per vendor)",
      points: rewards.find(r => r.activity === "rate_vendor")?.points || 5,
      action: () => navigate("/communities/boca-bridges"),
      buttonText: isMobile ? "Rate" : "Rate Vendors"
    },
    {
      type: "vendor_submission",
      title: "Submit a New Vendor",
      description: "Add a new service provider to help your community",
      points: rewards.find(r => r.activity === "vendor_submission")?.points || 5,
      action: () => navigate("/submit?community=Boca%20Bridges"),
      buttonText: isMobile ? "Submit" : "Add Vendor"
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
        <CardContent className={isMobile ? "space-y-6" : "space-y-4"}>
          {activities.map((activity) => (
            <div 
              key={activity.type} 
              className={`rounded-lg border ${
                isMobile 
                  ? "p-5 space-y-4" 
                  : "p-4 flex items-center justify-between"
              }`}
            >
              <div className={isMobile ? "space-y-3" : "flex-1"}>
                <div className={isMobile ? "space-y-2" : "flex items-center gap-2 mb-1"}>
                  <h4 className="font-medium text-base">{activity.title}</h4>
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded inline-block">
                    +{activity.points} pts
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activity.description}
                </p>
              </div>
              <Button 
                onClick={activity.action}
                size={isMobile ? "default" : "sm"}
                variant="outline"
                disabled={activity.type === "invite_neighbor" && loading}
                className={`flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 ${
                  isMobile 
                    ? "w-full justify-center py-3" 
                    : "ml-4"
                }`}
              >
                {activity.type === "invite_neighbor" ? (
                  <>
                    <Share2 className="w-4 h-4" />
                    {loading ? 'Generating...' : activity.buttonText}
                  </>
                ) : (
                  <>
                    {activity.buttonText}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
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