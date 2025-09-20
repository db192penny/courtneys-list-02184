import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { capitalizeStreetName, extractStreetName } from "@/utils/address";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";
import { MobileCostsModal } from "./MobileCostsModal";
import { useState } from "react";

type Props = {
  vendorId: string;
  children: React.ReactNode;
};

type PreviewCost = {
  id: string;
  amount: number | null;
  unit: string | null;
  period: string | null;
  cost_kind: string | null;
  notes: string | null;
  created_at: string;
  session_id: string;
  anonymous: boolean;
};

type PreviewSession = {
  id: string;
  name: string;
  street_name?: string;
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

const getAuthorLabel = (cost: PreviewCost, session: PreviewSession | undefined) => {
  if (cost.anonymous || !session?.name) {
    return "Neighbor";
  }
  
  const formattedName = formatNameWithLastInitial(session.name.trim());
  const street = session.street_name;
  
  if (street?.trim()) {
    const cleanStreet = capitalizeStreetName(extractStreetName(street.trim()));
    return `${formattedName} on ${cleanStreet}`;
  }
  
  return formattedName;
};

export default function PreviewCostsHover({ vendorId, children }: Props) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { data: costs, isLoading } = useQuery({
    queryKey: ["preview-vendor-costs", vendorId],
    queryFn: async () => {
      let formattedRealCosts: any[] = [];
      
      // Try to fetch real costs, but handle RLS errors gracefully
      try {
        const realCostsResponse = await supabase
          .from("costs")
          .select(`
            id,
            amount,
            unit,
            period,
            cost_kind,
            notes,
            created_at,
            anonymous,
            users!inner(name, street_name, show_name_public)
          `)
          .eq("vendor_id", vendorId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (!realCostsResponse.error) {
          const realCosts = realCostsResponse.data || [];
          formattedRealCosts = realCosts.map((cost: any) => {
            const user = cost.users;
            let authorLabel = "Neighbor";
            
            if (!cost.anonymous && user?.show_name_public && user?.name?.trim()) {
              const formattedName = formatNameWithLastInitial(user.name.trim());
              authorLabel = formattedName;
              
              if (user.street_name?.trim()) {
                const cleanStreet = capitalizeStreetName(extractStreetName(user.street_name.trim()));
                authorLabel += ` on ${cleanStreet}`;
              }
            }

            return {
              id: cost.id,
              amount: cost.amount,
              unit: cost.unit,
              period: cost.period,
              cost_kind: cost.cost_kind,
              notes: cost.notes,
              created_at: cost.created_at,
              author_label: authorLabel,
              type: 'real'
            };
          });
        }
      } catch (error) {
        // Silently handle RLS errors for logged-out users
        console.log("Cannot fetch real costs (user not authenticated)");
      }

      // Fetch preview costs (always accessible)
      const previewCostsResponse = await supabase
        .from("preview_costs")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (previewCostsResponse.error) {
        console.error("Failed to fetch preview costs:", previewCostsResponse.error);
        return formattedRealCosts;
      }

      const previewCostsData = previewCostsResponse.data || [];
      
      // Get unique session IDs for preview costs
      const sessionIds = [...new Set(previewCostsData.map(c => c.session_id))];
      
      // Fetch session data for author labels
      const { data: sessionsData } = await supabase
        .from("preview_sessions")
        .select("id, name, street_name")
        .in("id", sessionIds);

      const sessionsMap = new Map(sessionsData?.map(s => [s.id, s]) || []);

      // Format preview costs
      const formattedPreviewCosts = previewCostsData.map(cost => ({
        id: `preview-${cost.id}`,
        amount: cost.amount,
        unit: cost.unit,
        period: cost.period,
        cost_kind: cost.cost_kind,
        notes: cost.notes,
        created_at: cost.created_at,
        author_label: getAuthorLabel(cost, sessionsMap.get(cost.session_id)),
        type: 'preview'
      }));

      // Combine both types of costs and sort by creation date
      const allCosts = [...formattedRealCosts, ...formattedPreviewCosts];
      return allCosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!vendorId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  if (isLoading || !costs) {
    return <>{children}</>;
  }

  // Show costs that have either an amount or comments
  const displayableCosts = costs.filter(cost => 
    (cost.amount != null && cost.amount > 0) || (cost.notes && cost.notes.trim())
  );

  if (displayableCosts.length === 0) {
    return <>{children}</>;
  }

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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            {(() => {
              const costsWithAmounts = displayableCosts.filter(c => 
                c.amount !== null && 
                c.amount !== undefined && 
                c.amount > 0
              );
              
              const hasValidAmounts = costsWithAmounts.length > 0;
              const firstComment = displayableCosts.find(c => c.notes && c.notes.trim())?.notes;
              
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