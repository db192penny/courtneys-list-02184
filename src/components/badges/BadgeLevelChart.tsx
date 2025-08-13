import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Lock, CheckCircle } from "lucide-react";
import { useBadgeLevels, getUserCurrentBadge } from "@/hooks/useBadgeLevels";
import { cn } from "@/lib/utils";
import UserBadge from "./UserBadge";

type BadgeLevelChartProps = {
  currentPoints: number;
};

export default function BadgeLevelChart({ currentPoints }: BadgeLevelChartProps) {
  const { data: badgeLevels = [] } = useBadgeLevels();
  const currentBadge = getUserCurrentBadge(currentPoints, badgeLevels);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Badge Levels
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {badgeLevels.map((badge, index) => {
            const isEarned = currentPoints >= badge.min_points;
            const isCurrent = currentBadge?.id === badge.id;
            const isNext = !isEarned && (index === 0 || currentPoints >= badgeLevels[index - 1]?.min_points);

            return (
              <div
                key={badge.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-all",
                  isEarned ? "bg-primary/5 border-primary/20" : "bg-muted/30",
                  isCurrent && "ring-2 ring-primary/50",
                  isNext && !isEarned && "border-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <UserBadge 
                      name={badge.name}
                      color={badge.color}
                      icon={badge.icon}
                      showName={false}
                      size="lg"
                      className={cn(
                        "transition-all",
                        !isEarned && "opacity-50 grayscale"
                      )}
                    />
                    {isEarned && (
                      <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-green-500 bg-background rounded-full" />
                    )}
                    {!isEarned && (
                      <Lock className="absolute -top-1 -right-1 w-4 h-4 text-muted-foreground bg-background rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={cn("font-medium", !isEarned && "text-muted-foreground")}>
                        {badge.name}
                      </h4>
                      {isCurrent && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                      {isNext && !isEarned && (
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                          Next
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {badge.min_points} {badge.min_points === 1 ? 'point' : 'points'} required
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {isEarned ? (
                    <div className="text-green-600 font-medium">Earned!</div>
                  ) : (
                    <div className="text-muted-foreground">
                      {badge.min_points - currentPoints} more needed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}