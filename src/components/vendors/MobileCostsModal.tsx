import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  vendorId: string;
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

export function MobileCostsModal({ vendorId }: Props) {
  const { data: costs, isLoading } = useQuery({
    queryKey: ["mobile-vendor-costs", vendorId],
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

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading cost details…</div>;
  }

  if (!costs || costs.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No cost submissions yet.</div>;
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-3 p-4">
      <div className="space-y-2">
        {costs.map((cost) => (
          <div key={cost.id} className="border rounded-md p-3">
            <div className="text-xs text-foreground flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="font-medium">
                  {formatCost(cost.amount, cost.unit, cost.period)}
                  {cost.cost_kind && cost.cost_kind !== "one_time" && (
                    <span className="text-muted-foreground ml-1">
                      ({cost.cost_kind.replace("_", " ")})
                    </span>
                  )}
                </div>
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  {cost.author_label}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(cost.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}