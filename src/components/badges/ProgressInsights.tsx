import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Target, TrendingUp } from "lucide-react";
import { useBadgeLevels, getUserCurrentBadge, getUserNextBadge } from "@/hooks/useBadgeLevels";
import { usePointBreakdown } from "@/hooks/usePointHistory";
import { usePointRewards } from "@/hooks/usePointRewards";

type ProgressInsightsProps = {
  currentPoints: number;
};

export default function ProgressInsights({ currentPoints }: ProgressInsightsProps) {
  const { data: badgeLevels = [] } = useBadgeLevels();
  const { data: breakdown = [] } = usePointBreakdown();
  const { data: rewards = [] } = usePointRewards();
  
  const currentBadge = getUserCurrentBadge(currentPoints, badgeLevels);
  const nextBadge = getUserNextBadge(currentPoints, badgeLevels);

  if (!nextBadge) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Achievement Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-semibold text-lg">Maximum Level Reached!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You've achieved the highest badge level with {currentPoints} points!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pointsNeeded = nextBadge.min_points - currentPoints;
  
  // Calculate suggestions based on point rewards
  const vendorReward = rewards.find(r => r.activity === "vendor_submission")?.points || 10;
  const reviewReward = rewards.find(r => r.activity === "review_submission")?.points || 5;
  const costReward = rewards.find(r => r.activity === "cost_submission")?.points || 5;

  const suggestions = [
    {
      activity: "Submit vendors",
      count: Math.ceil(pointsNeeded / vendorReward),
      points: vendorReward,
      icon: "🏢"
    },
    {
      activity: "Write reviews", 
      count: Math.ceil(pointsNeeded / reviewReward),
      points: reviewReward,
      icon: "⭐"
    },
    {
      activity: "Share cost info",
      count: Math.ceil(pointsNeeded / costReward), 
      points: costReward,
      icon: "💰"
    }
  ].sort((a, b) => a.count - b.count);

  // Analyze recent activity
  const hasVendorSubmissions = breakdown.some(b => b.activity_type === "vendor_submission");
  const hasReviews = breakdown.some(b => b.activity_type === "review_submission");
  const hasCosts = breakdown.some(b => b.activity_type === "cost_submission");

  let personalizedTip = "";
  if (hasVendorSubmissions && !hasReviews) {
    personalizedTip = "You've submitted vendors but haven't reviewed them yet. Writing reviews earns extra points!";
  } else if (hasReviews && !hasCosts) {
    personalizedTip = "Consider sharing cost information for vendors you've reviewed to help neighbors budget.";
  } else if (!hasVendorSubmissions) {
    personalizedTip = "Submitting a new vendor gives the most points per action. Know any great service providers?";
  } else {
    personalizedTip = "You're doing great! Keep contributing in all areas to maximize your points.";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Progress Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-accent/10 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-accent" />
            <h4 className="font-medium">Next Goal: {nextBadge.name}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            You need {pointsNeeded} more {pointsNeeded === 1 ? 'point' : 'points'} to reach the next level.
          </p>
          
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Fastest paths:</h5>
            {suggestions.slice(0, 2).map((suggestion, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span>{suggestion.icon}</span>
                <span>
                  {suggestion.activity}: {suggestion.count} more 
                  ({suggestion.points} pts each)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Personalized Tip</h4>
          </div>
          <p className="text-sm text-muted-foreground">{personalizedTip}</p>
        </div>

        {breakdown.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            <p>Your most productive activity: {
              breakdown.reduce((max, current) => 
                current.total_points > max.total_points ? current : max
              ).activity_type.replace('_', ' ')
            }</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}