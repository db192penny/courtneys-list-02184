import { Progress } from "@/components/ui/progress";
import { BadgeLevel } from "@/hooks/useBadgeLevels";
import { cn } from "@/lib/utils";

type BadgeProgressProps = {
  currentPoints: number;
  currentBadge: BadgeLevel | null;
  nextBadge: BadgeLevel | null;
  className?: string;
};

export default function BadgeProgress({ 
  currentPoints, 
  currentBadge, 
  nextBadge, 
  className 
}: BadgeProgressProps) {
  if (!nextBadge) {
    return (
      <div className={cn("text-center", className)}>
        <p className="text-sm text-muted-foreground font-medium">
          🎉 Maximum level reached!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          You've earned {currentPoints} points total
        </p>
      </div>
    );
  }

  const pointsNeeded = nextBadge.min_points - currentPoints;
  const pointsInLevel = currentBadge ? currentPoints - currentBadge.min_points : currentPoints;
  const totalPointsForLevel = nextBadge.min_points - (currentBadge?.min_points || 0);
  const progressPercentage = Math.min((pointsInLevel / totalPointsForLevel) * 100, 100);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">
          Progress to {nextBadge.name}
        </span>
        <span className="text-sm text-muted-foreground">
          {pointsInLevel}/{totalPointsForLevel} points
        </span>
      </div>
      
      <Progress 
        value={progressPercentage} 
        className="h-3 bg-muted"
        style={{
          // @ts-ignore - Custom CSS property for progress color
          '--progress-color': nextBadge.color
        }}
      />
      
      <p className="text-xs text-muted-foreground text-center">
        {pointsNeeded} more {pointsNeeded === 1 ? 'point' : 'points'} needed for next level
      </p>
    </div>
  );
}