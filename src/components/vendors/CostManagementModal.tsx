import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CostInputs, { CostEntry, buildDefaultCosts } from "./CostInputs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
};

export default function CostManagementModal({ open, onOpenChange, vendor, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasExistingCosts, setHasExistingCosts] = useState(false);

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

        // Prefill latest costs for this vendor limited to current user's household (RLS enforces it)
        const { data: costRows } = await supabase
          .from("costs")
          .select("amount, period, unit, quantity, cost_kind, created_at")
          .eq("vendor_id", vendor.id)
          .order("created_at", { ascending: false });

        if (!isActive) return;

        let mergedCosts: CostEntry[] = baseCosts;
        let hasExisting = false;

        if (costRows && costRows.length) {
          hasExisting = true;
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

      // Insert cost rows for this household
      const payloads = (costs || []).filter(c => c.amount != null).map((c) => ({
        vendor_id: vendor.id,
        amount: c.amount as number,
        currency: "USD",
        period: c.period ?? (c.cost_kind === "monthly_plan" ? "monthly" : null),
        unit: c.unit ?? undefined,
        quantity: c.quantity ?? undefined,
        cost_kind: c.cost_kind,
        household_address,
        created_by: userId,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasExistingCosts ? "Edit Costs" : "Add Costs"} — {vendor?.name}
          </DialogTitle>
        </DialogHeader>
        {vendor && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Cost Information</Label>
              <CostInputs category={vendor.category} value={costs} onChange={setCosts} />
            </div>
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