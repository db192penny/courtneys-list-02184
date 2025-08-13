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
      type: "vendor_submission",
      title: "Submit a Vendor",
      description: "Add a new service provider to help your community",
      points: rewards.find(r => r.activity === "vendor_submission")?.points || 10,
      action: () => navigate("/submit-vendor"),
      buttonText: "Add Vendor"
    },
    {
      type: "review_submission", 
      title: "Write a Review",
      description: "Share your experience with a vendor",
      points: rewards.find(r => r.activity === "review_submission")?.points || 5,
      action: () => navigate("/community"),
      buttonText: "Browse Vendors"
    },
    {
      type: "cost_submission",
      title: "Share Cost Information", 
      description: "Help neighbors understand service pricing",
      points: rewards.find(r => r.activity === "cost_submission")?.points || 5,
      action: () => navigate("/community"),
      buttonText: "Add Costs"
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
              className="ml-4 flex items-center gap-1"
            >
              {activity.buttonText}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}