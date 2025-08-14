import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  vendorId: string;
  children: React.ReactNode;
};

type CostData = {
  id: string;
  amount: number;
  unit: string | null;
  period: string | null;
  cost_kind: string | null;
  created_at: string;
  author_label: string;
};

const formatCost = (amount: number, unit?: string | null, period?: string | null) => {
  const formattedAmount = amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
  
  let unitDisplay = "";
  if (unit && unit !== "job") {
    unitDisplay = `/${unit}`;
  } else if (period && period !== "one_time") {
    unitDisplay = `/${period}`;
  }
  
  return `$${formattedAmount}${unitDisplay}`;
};

export default function CostsHover({ vendorId, children }: Props) {
  const { data: costs, isLoading } = useQuery({
    queryKey: ["vendor-costs", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_costs", {
        _vendor_id: vendorId,
      });
      
      if (error) {
        console.error("Error fetching costs:", error);
        throw error;
      }
      
      return data as CostData[];
    },
    enabled: !!vendorId,
  });

  if (isLoading || !costs || costs.length === 0) {
    return <>{children}</>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="cursor-pointer underline decoration-dotted underline-offset-4">
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Community Cost Submissions</h4>
          <div className="space-y-2">
            {costs.map((cost) => (
              <div key={cost.id} className="text-sm">
                <div className="font-medium">
                  {formatCost(cost.amount, cost.unit, cost.period)}
                  {cost.cost_kind && cost.cost_kind !== "one_time" && (
                    <span className="text-muted-foreground ml-1">
                      ({cost.cost_kind.replace("_", " ")})
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  by {cost.author_label} • {new Date(cost.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}