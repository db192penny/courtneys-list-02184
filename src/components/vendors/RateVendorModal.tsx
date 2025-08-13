import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CostInputs, { CostEntry, buildDefaultCosts } from "./CostInputs";
import { supabase } from "@/integrations/supabase/client";

export default function RateVendorModal({
  open,
  onOpenChange,
  vendor,
  mode = "rate",
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  mode?: "rate" | "addHome";
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState<string>("");
  const [comments, setComments] = useState<string>("");
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const prefill = async () => {
      if (!vendor) {
        setCosts([]);
        setRating("");
        setComments("");
        setAnonymous(false);
        return;
      }

      const baseCosts = buildDefaultCosts(vendor.category);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setCosts(baseCosts);
          setRating("");
          setComments("");
          setAnonymous(false);
          return;
        }

        // Prefill existing review by this user for this vendor
        const { data: review } = await supabase
          .from("reviews")
          .select("rating, comments, anonymous")
          .eq("vendor_id", vendor.id)
          .eq("user_id", user.id)
          .maybeSingle();

        // Prefill latest costs for this vendor limited to current user's household (RLS enforces it)
        const { data: costRows } = await supabase
          .from("costs")
          .select("amount, period, unit, quantity, cost_kind, created_at")
          .eq("vendor_id", vendor.id)
          .order("created_at", { ascending: false });

        if (!isActive) return;

        if (review) {
          setRating(String(review.rating ?? ""));
          setComments(review.comments ?? "");
          setAnonymous(!!review.anonymous);
        } else {
          setRating("");
          setComments("");
          setAnonymous(false);
        }

        let mergedCosts: CostEntry[] = baseCosts;
        if (costRows && costRows.length) {
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
      } catch (e) {
        console.warn("[RateVendorModal] prefill error", e);
        setCosts(baseCosts);
      }
    };

    prefill();
    return () => {
      isActive = false;
    };
  }, [vendor?.id]);

  const title = vendor ? `${mode === "addHome" ? "Add to My Home" : "Rate Vendor"} — ${vendor.name}` : "Rate Vendor";

  const onSubmit = async () => {
    if (!vendor) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast({ title: "Sign in required", description: "Please sign in to continue.", variant: "destructive" });
      return;
    }
    const ratingInt = parseInt(rating, 10);
    if (!ratingInt || ratingInt < 1 || ratingInt > 5) {
      toast({ title: "Rating required", description: "Please select a rating from 1 to 5.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = auth.user.id;

      // 1) Upsert review
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("vendor_id", vendor.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("reviews").update({ rating: ratingInt, comments: comments || null, anonymous }).eq("id", existing.id);
      } else {
        await supabase.from("reviews").insert({ vendor_id: vendor.id, user_id: userId, rating: ratingInt, comments: comments || null, anonymous });
      }

      // 2) Insert cost rows for this household
      const { data: me } = await supabase.from("users").select("address").eq("id", userId).maybeSingle();
      const household_address = me?.address;
      if (household_address) {
        const payloads = (costs || []).filter(c => c.amount != null).map((c) => ({
          vendor_id: vendor.id,
          amount: c.amount as number,
          currency: "USD",
          period: c.period ?? (c.cost_kind === "monthly_plan" ? "monthly" : null),
          unit: c.unit ?? undefined,
          quantity: c.quantity ?? undefined,
          cost_kind: c.cost_kind,
          household_address,
        }));
        if (payloads.length) {
          const { error: costErr } = await supabase.from("costs").insert(payloads as any);
          if (costErr) console.warn("[RateVendorModal] cost insert error", costErr);
        }
      }

      // 3) Upsert to home_vendors when needed
      if (mode === "addHome") {
        const primary = (costs || []).find(c => c.cost_kind === "monthly_plan" && c.amount != null) || (costs || []).find(c => c.amount != null);
        const hv = {
          user_id: userId,
          vendor_id: vendor.id,
          my_rating: ratingInt,
          amount: primary?.amount ?? null,
          currency: primary?.amount != null ? "USD" : null,
          period: primary?.cost_kind === "monthly_plan" ? "monthly" : (primary?.cost_kind === "hourly" ? "hourly" : null),
        } as any;
        // upsert requires unique index on (user_id, vendor_id)
        const { error: hvErr } = await supabase.from("home_vendors").upsert(hv, { onConflict: "user_id,vendor_id" });
        if (hvErr) console.warn("[RateVendorModal] home_vendors upsert error", hvErr);
      }

      toast({ title: "Saved", description: "Thanks for contributing!" });
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {vendor && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Rating</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select 1–5" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Comments (optional)</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.currentTarget.value)} placeholder="Share your experience" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="anonymous" checked={anonymous} onCheckedChange={setAnonymous} />
              <Label htmlFor="anonymous">Hide my name on this review</Label>
            </div>
            <div className="grid gap-2">
              <Label>Costs</Label>
              <CostInputs category={vendor.category} value={costs} onChange={setCosts} />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button onClick={onSubmit} disabled={loading}>{loading ? "Saving..." : (mode === "addHome" ? "Save & Add" : "Save")}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
