import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { capitalizeStreetName, extractStreetName } from "@/utils/address";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";

type Props = {
  vendorId: string;
  children: React.ReactNode;
};

type PreviewCost = {
  id: string;
  amount: number;
  unit: string | null;
  period: string | null;
  cost_kind: string | null;
  created_at: string;
  session_id: string;
  anonymous: boolean;
};

type PreviewSession = {
  id: string;
  name: string;
  street_name?: string;
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
  });

  if (isLoading || !costs || costs.length === 0) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
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
              <div key={cost.id} className="border rounded-md p-2">
                <div className="text-xs text-foreground flex items-center justify-between">
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
                {cost.notes && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {cost.notes.length > 100 ? cost.notes.substring(0, 100) + '...' : cost.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}