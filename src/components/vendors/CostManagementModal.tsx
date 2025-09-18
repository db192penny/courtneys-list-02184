import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import CostInputs, { CostEntry, buildDefaultCosts } from "./CostInputs";
import CostPreview from "./CostPreview";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { extractStreetName, capitalizeStreetName } from "@/utils/address";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  isPreviewMode?: boolean;
};

export default function CostManagementModal({ open, onOpenChange, vendor, onSuccess, isPreviewMode }: Props) {
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
          .is("deleted_at", null)
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
        console.warn("[CostManagementModal] prefill error", e);
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

      // Get existing costs for this user/vendor combination to handle deletions
      const { data: existingCosts } = await supabase
        .from("costs")
        .select("id, cost_kind")
        .eq("vendor_id", vendor.id)
        .eq("created_by", userId)
        .is("deleted_at", null);

      // Identify which cost kinds have been cleared (were in existing but now null/empty)
      const currentCostKinds = new Set((costs || []).filter(c => c.amount != null).map(c => c.cost_kind));
      const clearedCosts = (existingCosts || []).filter(existing => 
        !currentCostKinds.has(existing.cost_kind as any)
      );

      // Soft delete cleared costs
      if (clearedCosts.length > 0) {
        console.log("[CostManagementModal] Soft deleting cleared costs:", clearedCosts);
        const { error: deleteErr } = await supabase
          .from("costs")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: userId,
          })
          .in("id", clearedCosts.map(c => c.id));

        if (deleteErr) {
          console.error("[CostManagementModal] soft delete error", deleteErr);
          toast({
            title: "Error updating cost information",
            description: "Please try again.",
            variant: "destructive",
          });
          return;
        } else {
          console.log("[CostManagementModal] Costs soft deleted successfully");
        }
      }

      // Insert/update cost rows for this household
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
        deleted_at: null, // Ensure we're not soft-deleted when upserting
        deleted_by: null,
      }));

      if (payloads.length > 0) {
        console.log("[CostManagementModal] Upserting costs:", payloads);
        const { error: costErr } = await supabase.from("costs").upsert(payloads as any, {
          onConflict: 'created_by,vendor_id,cost_kind'
        });
        
        if (costErr) {
          console.error("[CostManagementModal] cost upsert error", costErr);
          toast({
            title: "Error saving cost information",
            description: "Please try again.",
            variant: "destructive",
          });
          return;
        } else {
          console.log("[CostManagementModal] Costs upserted successfully");
        }
      }

      // Invalidate relevant caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-costs", vendor.id] });
      queryClient.invalidateQueries({ queryKey: ["user-costs"] });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasExistingCosts ? "Edit Costs" : "Share Costs"} — {vendor?.name}
          </DialogTitle>
        </DialogHeader>
        {vendor && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Cost Information</Label>
              <CostInputs category={vendor.category} value={costs} onChange={setCosts} />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-name-costs"
                checked={showNameInCosts}
                onCheckedChange={(checked) => setShowNameInCosts(checked as boolean)}
              />
              <Label htmlFor="show-name-costs" className="text-sm font-normal">
                Show my name in costs
              </Label>
            </div>

            <CostPreview 
              costs={costs} 
              showNameInCosts={showNameInCosts} 
              authorLabel={authorLabel}
            />
            
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button onClick={onSubmit} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}