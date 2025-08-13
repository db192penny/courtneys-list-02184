import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Clock, Plus } from "lucide-react";
import { usePointHistory } from "@/hooks/usePointHistory";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const activityTypeLabels = {
  vendor_submission: "Submit a New Vendor",
  rate_vendor: "Rate a Vendor", 
  invite_neighbor: "Invite a Neighbor"
};

const activityTypeIcons = {
  vendor_submission: "🏢",
  rate_vendor: "⭐",
  invite_neighbor: "👥"
};

export default function PointHistoryTable() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: history = [], isLoading } = usePointHistory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Point History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayHistory = isOpen ? history : history.slice(0, 5);
  const hasMore = history.length > 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Point History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No point history yet</p>
            <p className="text-sm mt-1">Start participating to earn points!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {activityTypeIcons[entry.activity_type as keyof typeof activityTypeIcons] || "📋"}
                    </span>
                    <div>
                      <p className="font-medium text-sm">
                        {activityTypeLabels[entry.activity_type as keyof typeof activityTypeLabels] || entry.activity_type}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-semibold">
                    <Plus className="w-3 h-3" />
                    {entry.points_earned}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-center">
                    {isOpen ? (
                      <>
                        Show Less <ChevronUp className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show All ({history.length - 5} more) <ChevronDown className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {history.slice(5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {activityTypeIcons[entry.activity_type as keyof typeof activityTypeIcons] || "📋"}
                          </span>
                          <div>
                            <p className="font-medium text-sm">
                              {activityTypeLabels[entry.activity_type as keyof typeof activityTypeLabels] || entry.activity_type}
                            </p>
                            <p className="text-xs text-muted-foreground">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <Plus className="w-3 h-3" />
                          {entry.points_earned}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}