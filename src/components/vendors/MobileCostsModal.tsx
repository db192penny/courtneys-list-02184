import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  vendorId: string;
};

type CostData = {
  id: string;
  amount: number | null;
  unit: string | null;
  period: string | null;
  cost_kind: string | null;
  notes: string | null;
  created_at: string;
  author_label: string;
};

const formatCost = (amount: number | null, unit?: string | null, period?: string | null) => {
  if (amount === null || amount === undefined) {
    return null;
  }
  
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
      <h4 className="font-medium text-gray-700">What neighbors are paying:</h4>
      <div className="space-y-3">
        {costs.map((cost) => (
          <div key={cost.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            {formatCost(cost.amount, cost.unit, cost.period) ? (
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-700">
                  {formatCost(cost.amount, cost.unit, cost.period)}
                  {cost.cost_kind && cost.cost_kind !== "one_time" && (
                    <span className="text-gray-600 ml-1 text-xs">
                      ({cost.cost_kind.replace("_", " ")})
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(cost.created_at).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">
                  {new Date(cost.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {cost.notes && (
              <p className="text-sm text-gray-600 italic mt-1">
                "{cost.notes}"
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              — {cost.author_label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}