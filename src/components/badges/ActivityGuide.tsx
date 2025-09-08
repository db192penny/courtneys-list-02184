import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePointRewards } from "@/hooks/usePointRewards";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

export default function ActivityGuide() {
  const navigate = useNavigate();
  const { data: rewards = [] } = usePointRewards();
  const { toast } = useToast();
  
  // Invite functionality state
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
      const url = `${baseUrl}/communities/boca-bridges?invite=${code}&inviter=${user.id}&welcome=true`;
      setInviteUrl(url);

      // Try to copy automatically
      await copyToClipboard(url);
      
      // Always show success toast - no modal
      toast({ 
        title: '📋 Invite Link Copied!',
        description: 'Earn 10 points when your neighbor joins! That\'s halfway to your free Starbucks! ☕',
        duration: 5000,
        className: "bg-green-50 border-green-500 border-2"
      });
      
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

  const activities = [
    {
      type: "invite_neighbor",
      title: "Invite a Neighbor", 
      description: "Invite someone from your community to join",
      points: rewards.find(r => r.activity === "invite_neighbor")?.points || 10,
      action: generateInvite,
      buttonText: "Invite Neighbors"
    },
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
    }
  ];

  return (
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
              disabled={activity.type === "invite_neighbor" && loading}
              className="ml-4 flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
            >
              {activity.type === "invite_neighbor" ? (
                <>
                  <Share2 className="w-3 h-3" />
                  {loading ? 'Generating...' : activity.buttonText}
                </>
              ) : (
                <>
                  {activity.buttonText}
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}