import { Card, CardContent } from "@/components/ui/card";
import { CostEntry } from "./CostInputs";

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
              <div key={index} className="text-sm">
                <div className="font-medium">
                  {formatCost(cost.amount as number, cost.unit, cost.period)}
                  {cost.cost_kind && (
                    <span className="text-muted-foreground ml-1">
                      ({cost.cost_kind.replace("_", " ")})
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  by {showNameInCosts ? authorLabel : "Neighbor"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}