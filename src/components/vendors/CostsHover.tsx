import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { MobileCostsModal } from "./MobileCostsModal";
import { useState } from "react";

type Props = {
  vendorId: string;
  children: React.ReactNode;
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

export default function CostsHover({ vendorId, children }: Props) {
  const { data: profile } = useUserProfile();
  const navigate = useNavigate();
  const isVerified = !!profile?.isVerified;
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const { data: costs, isLoading, error } = useQuery({
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
    enabled: isVerified && !!vendorId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  return (
    <>
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-pointer underline decoration-dotted underline-offset-4">
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Community Cost Submissions</h4>
            {!isVerified && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Costs are shared just within our neighborhood circle. Sign up to view them.
                </div>
                <Button 
                  onClick={() => navigate('/auth/signup')}
                  size="sm"
                  className="w-full"
                >
                  Sign Up to View Costs
                </Button>
              </div>
            )}
          {isVerified && isLoading && (
            <div className="text-sm text-muted-foreground">Loading costs...</div>
          )}
          {isVerified && error && (
            <div className="text-sm text-muted-foreground">Unable to load costs.</div>
          )}
          {isVerified && costs && costs.length === 0 && (
            <div className="text-sm text-muted-foreground">No cost submissions yet.</div>
          )}
          {isVerified && costs && costs.length > 0 && (
            <div className="space-y-2">
              {costs.filter((cost, index, array) => {
                // Keep cost if it has an amount, or if it's the first occurrence of a comment from this author
                if (cost.amount != null && cost.amount > 0) return true;
                if (cost.notes && cost.notes.trim()) {
                  const firstOccurrence = array.findIndex(c => 
                    c.author_label === cost.author_label && 
                    c.notes === cost.notes &&
                    (c.amount == null || c.amount === 0)
                  );
                  return firstOccurrence === index;
                }
                return false;
              }).map((cost) => (
                <div key={cost.id} className="border rounded-md p-2">
                  <div className="text-xs text-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {formatCost(cost.amount, cost.unit, cost.period) ? (
                        <div className="font-medium">
                          {formatCost(cost.amount, cost.unit, cost.period)}
                          {cost.cost_kind && cost.cost_kind !== "one_time" && (
                            <span className="text-muted-foreground ml-1">
                              ({cost.cost_kind.replace("_", " ")})
                            </span>
                          )}
                        </div>
                      ) : null}
                      <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                        {cost.author_label}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(cost.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {cost.notes && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {cost.notes.length > 100 ? cost.notes.substring(0, 100) + '...' : cost.notes}
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setDetailsModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-700 mt-2"
              >
                See details
              </button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>

    {/* Full Details Modal */}
    <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Cost Details</DialogTitle>
        </DialogHeader>
        <MobileCostsModal vendorId={vendorId} />
      </DialogContent>
    </Dialog>
  </>
  );
}