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
    if (vendor) {
      setCosts(buildDefaultCosts(vendor.category));
    } else {
      setCosts([]);
    }
    setRating("");
    setComments("");
  }, [vendor?.id, open]);

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
