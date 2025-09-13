import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useBadgeLevels, getUserCurrentBadge, getUserNextBadge } from "@/hooks/useBadgeLevels";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import UserBadge from "./UserBadge";

type BadgeLevelChartProps = {
  currentPoints: number;
};

export default function BadgeLevelChart({ currentPoints }: BadgeLevelChartProps) {
  const { data: badgeLevels = [] } = useBadgeLevels();
  const currentBadge = getUserCurrentBadge(currentPoints, badgeLevels);
  const nextBadge = getUserNextBadge(currentPoints, badgeLevels);
  const isMobile = useIsMobile();

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
          {badgeLevels.map((badge) => {
            const isEarned = currentPoints >= badge.min_points;
            const isCurrent = currentBadge?.id === badge.id;
            const isNext = nextBadge?.id === badge.id;
            const pointsNeeded = isEarned ? 0 : badge.min_points - currentPoints;

            const getBadgeState = () => {
              if (isEarned) return "earned";
              if (isCurrent) return "current";
              if (isNext) return "next";
              return "locked";
            };

            return (
              <div
                key={badge.id}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-300",
                  isEarned ? "bg-card border-primary/20" : "bg-muted/50 border-border",
                  isCurrent && "ring-2 ring-primary/50 shadow-lg",
                  isNext && "ring-1 ring-badge-glow/50 bg-badge-glow/5",
                  isMobile ? "space-y-4" : "flex items-center justify-between"
                )}
              >
                {/* Badge and Info Section */}
                <div className={cn(
                  "flex items-center gap-4",
                  isMobile && "justify-center"
                )}>
                  <div className="relative">
                    <UserBadge 
                      name={badge.name}
                      color={badge.color}
                      icon={badge.icon}
                      showName={false}
                      size={isMobile ? "lg" : "lg"}
                      state={getBadgeState()}
                      pointsToUnlock={pointsNeeded}
                    />
                  </div>
                  
                  <div className={cn("flex-1", isMobile && "text-center")}>
                    <div className={cn(
                      "flex items-center gap-2",
                      isMobile && "justify-center flex-wrap"
                    )}>
                      <h4 className={cn(
                        "font-medium text-base transition-colors",
                        isEarned ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {badge.name}
                      </h4>
                      {isCurrent && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded font-medium animate-pulse-glow">
                          Current
                        </span>
                      )}
                      {isNext && (
                        <span className="text-xs bg-badge-glow text-white px-2 py-1 rounded font-medium">
                          Next Goal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {badge.min_points} {badge.min_points === 1 ? 'point' : 'points'} required
                    </p>
                  </div>
                </div>

                {/* Progress Section */}
                <div className={cn(
                  isMobile ? "text-center pt-2 border-t border-border/50" : "text-right"
                )}>
                  {isEarned ? (
                    <div className="text-badge-success font-medium text-sm animate-bounce-in">
                      ✓ Earned!
                    </div>
                  ) : (
                    <div className={cn(
                      "text-muted-foreground text-sm",
                      isNext && "text-badge-glow font-medium"
                    )}>
                      <span className="font-medium text-foreground">
                        {pointsNeeded}
                      </span>
                      <span className="block sm:inline">
                        {isMobile ? " more points needed" : " more needed"}
                      </span>
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