import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePointRewards } from "@/hooks/usePointRewards";

export default function ActivityGuide() {
  const navigate = useNavigate();
  const { data: rewards = [] } = usePointRewards();


  const activities = [
    {
      type: "invite_neighbor",
      title: "Invite a Neighbor", 
      description: "Invite someone from your community to join",
      points: rewards.find(r => r.activity === "invite_neighbor")?.points || 10,
      action: null, // No action - handled by SimpleInvite component
      buttonText: "Use invite button above"
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
              {activity.action ? (
                <Button 
                  onClick={activity.action}
                  size="sm"
                  variant="outline"
                  className="ml-4 flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
                >
                  {activity.buttonText}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              ) : (
                <div className="ml-4 text-xs text-muted-foreground italic">
                  {activity.buttonText}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

    </>
  );
}