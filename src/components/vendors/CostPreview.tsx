import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CostEntry } from "./CostInputs";
import { extractStreetName, capitalizeStreetName } from "@/utils/address";

type Props = {
  costs: CostEntry[];
  showNameInCosts: boolean;
  authorLabel: string;
};

const formatCost = (amount: number, unit?: string, period?: string) => {
  const formattedAmount = amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
  
  let unitDisplay = "";
  if (unit && unit !== "job") {
    unitDisplay = `/${unit}`;
  } else if (period && period !== "one_time") {
    unitDisplay = `/${period}`;
  }
  
  return `$${formattedAmount}${unitDisplay}`;
};

export default function CostPreview({ costs, showNameInCosts, authorLabel }: Props) {
  const validCosts = costs.filter(c => c.amount != null && c.amount > 0);
  
  if (validCosts.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Cost Preview</h4>
          <div className="space-y-1">
            {validCosts.map((cost, index) => (
              <div key={index} className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {formatCost(cost.amount as number, cost.unit, cost.period)}
                    {cost.cost_kind && (
                      <span className="text-muted-foreground ml-1">
                        ({cost.cost_kind.replace("_", " ")})
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                    {showNameInCosts ? authorLabel : (() => {
                      const streetMatch = authorLabel.match(/ on (.+)$/);
                      const cleanStreet = streetMatch ? extractStreetName(streetMatch[1]) : null;
                      return cleanStreet ? `Neighbor on ${capitalizeStreetName(cleanStreet)}` : "Neighbor";
                    })()}
                  </Badge>
                </div>
                {cost.notes && (
                  <div className="text-xs text-muted-foreground pl-2">
                    {cost.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}