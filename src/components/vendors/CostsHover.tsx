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
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              {(() => {
                const costsWithAmounts = costs.filter(c => 
                  c.amount !== null && 
                  c.amount !== undefined && 
                  c.amount > 0
                );
                
                const hasValidAmounts = costsWithAmounts.length > 0;
                const firstComment = costs.find(c => c.notes && c.notes.trim())?.notes;
                
                if (!hasValidAmounts && !firstComment) {
                  return (
                    <div className="text-center py-3 text-sm text-gray-500">
                      No cost information yet
                    </div>
                  );
                }
                
                return (
                  <>
                    {hasValidAmounts && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-green-700">
                          💰 {costsWithAmounts.length > 1 
                            ? `$${Math.min(...costsWithAmounts.map(c => c.amount))} - $${Math.max(...costsWithAmounts.map(c => c.amount))}`
                            : `$${costsWithAmounts[0].amount}`
                          }
                          {costsWithAmounts[0]?.period ? `/${costsWithAmounts[0].period}` : ''}
                        </span>
                      </div>
                    )}
                    
                    {firstComment && (
                      <p className="text-xs text-green-600 italic">
                        "{firstComment.length > 100 ? firstComment.substring(0, 100) + '...' : firstComment}"
                      </p>
                    )}
                    
                    <div className="text-right mt-2">
                      <button
                        onClick={() => setDetailsModalOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View all cost details →
                      </button>
                    </div>
                  </>
                );
              })()}
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