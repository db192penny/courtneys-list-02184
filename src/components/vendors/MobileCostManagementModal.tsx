import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import CostInputs, { CostEntry, buildDefaultCosts } from "./CostInputs";
import CostPreview from "./CostPreview";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { extractStreetName, capitalizeStreetName } from "@/utils/address";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  isPreviewMode?: boolean;
};

export default function MobileCostManagementModal({ open, onOpenChange, vendor, onSuccess, isPreviewMode }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasExistingCosts, setHasExistingCosts] = useState(false);
  const [showNameInCosts, setShowNameInCosts] = useState(true);
  const [authorLabel, setAuthorLabel] = useState("Neighbor");

  useEffect(() => {
    let isActive = true;

    const prefillCosts = async () => {
      if (!vendor) {
        setCosts([]);
        setHasExistingCosts(false);
        return;
      }

      const baseCosts = buildDefaultCosts(vendor.category);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setCosts(baseCosts);
          setHasExistingCosts(false);
          return;
        }

        // Get user profile for author label
        const { data: userProfile } = await supabase
          .from("users")
          .select("name, show_name_public, street_name")
          .eq("id", user.id)
          .maybeSingle();

        if (userProfile && isActive) {
          const displayName = userProfile.show_name_public && userProfile.name?.trim() 
            ? (userProfile.name.includes(' ')
                ? `${userProfile.name.split(' ')[0]} ${userProfile.name.split(' ').slice(-1)[0][0]}.`
                : userProfile.name.trim())
            : "Neighbor";
          const cleanStreet = userProfile.street_name ? extractStreetName(userProfile.street_name) : "";
          const streetSuffix = cleanStreet ? ` on ${capitalizeStreetName(cleanStreet)}` : "";
          setAuthorLabel(displayName + streetSuffix);
        }

        // Prefill latest costs for this vendor limited to current user's household (RLS enforces it)
        const { data: costRows } = await supabase
          .from("costs")
          .select("amount, period, unit, quantity, cost_kind, notes, created_at, anonymous")
          .eq("vendor_id", vendor.id)
          .order("created_at", { ascending: false });

        if (!isActive) return;

        let mergedCosts: CostEntry[] = baseCosts;
        let hasExisting = false;

        if (costRows && costRows.length) {
          hasExisting = true;
          // Set anonymity preference from most recent cost
          setShowNameInCosts(!costRows[0].anonymous);
          
          const byKind = new Map<string, typeof costRows[number]>();
          for (const row of costRows) {
            const k = String(row.cost_kind || "");
            if (k && !byKind.has(k)) byKind.set(k, row);
          }

          // Start from defaults then overlay user's latest values per kind
          mergedCosts = baseCosts.map((c) => {
            const hit = byKind.get(c.cost_kind);
            return hit
              ? {
                  ...c,
                  amount: (hit.amount as number) ?? c.amount,
                  period: (hit.period as any) ?? c.period,
                  unit: (hit.unit as any) ?? c.unit,
                  quantity: (hit.quantity as number | undefined) ?? c.quantity,
                  notes: (hit.notes as string | undefined) ?? c.notes,
                }
              : c;
          });

          // Include extra kinds the user has that aren't in defaults
          byKind.forEach((row, kind) => {
            if (!mergedCosts.find((c) => c.cost_kind === kind)) {
              mergedCosts.push({
                cost_kind: kind as any,
                amount: row.amount as number,
                period: row.period ?? undefined,
                unit: row.unit ?? undefined,
                quantity: (row.quantity as number | undefined) ?? undefined,
                notes: (row.notes as string | undefined) ?? undefined,
              } as CostEntry);
            }
          });
        }

        setCosts(mergedCosts);
        setHasExistingCosts(hasExisting);
      } catch (e) {
        console.warn("[MobileCostManagementModal] prefill error", e);
        setCosts(baseCosts);
        setHasExistingCosts(false);
      }
    };

    prefillCosts();
    return () => {
      isActive = false;
    };
  }, [vendor?.id]);

  const onSubmit = async () => {
    if (!vendor) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast({ title: "Sign in required", description: "Please sign in to continue.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = auth.user.id;

      // Get user's address for cost submission
      const { data: me } = await supabase.from("users").select("address").eq("id", userId).maybeSingle();
      const household_address = me?.address;
      
      if (!household_address) {
        toast({ title: "Address required", description: "Please update your address in your profile.", variant: "destructive" });
        return;
      }

      // Insert cost rows for this household
      const payloads = (costs || []).filter(c => c.amount != null).map((c) => ({
        vendor_id: vendor.id,
        amount: c.amount as number,
        currency: "USD",
        period: c.period ?? (c.cost_kind === "monthly_plan" ? "monthly" : null),
        unit: c.unit ?? undefined,
        quantity: c.quantity ?? undefined,
        cost_kind: c.cost_kind,
        notes: c.notes || null,
        household_address,
        created_by: userId,
        anonymous: !showNameInCosts,
      }));

      if (payloads.length > 0) {
        console.log("[MobileCostManagementModal] Upserting costs:", payloads);
        const { error: costErr } = await supabase.from("costs").upsert(payloads as any, {
          onConflict: 'created_by,vendor_id,cost_kind'
        });
        
        if (costErr) {
          console.error("[MobileCostManagementModal] cost upsert error", costErr);
          toast({
            title: "Error saving cost information",
            description: "Please try again.",
            variant: "destructive",
          });
          return;
        } else {
          console.log("[MobileCostManagementModal] Costs upserted successfully");
        }
      }

      // Invalidate relevant caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-costs"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "community-stats" 
      });
      
      toast({ title: "Saved", description: "Cost information updated successfully!" });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-lg shadow-lg"
            style={{ 
              height: '80vh',
              maxHeight: '80vh',
              position: 'fixed',
              touchAction: 'pan-y'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="text-left p-4 pb-4 flex-shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {hasExistingCosts ? "Edit Costs" : "Share Costs"} — {vendor?.name}
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onOpenChange(false)}
                    className="p-1 h-8 w-8"
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              {vendor && (
                <div className="flex-1 px-4 overflow-y-auto">
                  <div className="space-y-6 pb-4">
                    <div className="grid gap-3">
                      <Label>Cost Information</Label>
                      <CostInputs category={vendor.category} value={costs} onChange={setCosts} />
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        id="show-name-costs"
                        checked={showNameInCosts}
                        onCheckedChange={(checked) => setShowNameInCosts(checked as boolean)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="show-name-costs" className="text-sm font-medium leading-relaxed">
                        Show my name in costs
                      </Label>
                    </div>

                    <div className="p-3 bg-background border rounded-lg">
                      <CostPreview 
                        costs={costs} 
                        showNameInCosts={showNameInCosts} 
                        authorLabel={authorLabel}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex-shrink-0 bg-background border-t p-4">
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)} 
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={onSubmit} 
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}