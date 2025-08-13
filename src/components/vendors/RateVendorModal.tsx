import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";
import CostInputs, { CostEntry, buildDefaultCosts } from "./CostInputs";
import { supabase } from "@/integrations/supabase/client";
import { useUserData } from "@/hooks/useUserData";
import ReviewPreview from "@/components/ReviewPreview";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
};

export default function RateVendorModal({ open, onOpenChange, vendor, onSuccess }: Props) {
  const { toast } = useToast();
  const { data: userData } = useUserData();
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [showNameInReview, setShowNameInReview] = useState<boolean>(true);
  const [useForHome, setUseForHome] = useState<boolean>(true);
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const prefill = async () => {
      if (!vendor) {
        setCosts([]);
        setRating(0);
        setComments("");
        setShowNameInReview(true);
        setUseForHome(false);
        return;
      }

      const baseCosts = buildDefaultCosts(vendor.category);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setCosts(baseCosts);
          setRating(0);
          setComments("");
          setShowNameInReview(true);
          setUseForHome(false);
          return;
        }

        // Get user's current show_name_public setting
        const { data: userProfile } = await supabase
          .from("users")
          .select("show_name_public")
          .eq("id", user.id)
          .maybeSingle();

        // Prefill existing review by this user for this vendor
        const { data: review } = await supabase
          .from("reviews")
          .select("rating, comments, anonymous")
          .eq("vendor_id", vendor.id)
          .eq("user_id", user.id)
          .maybeSingle();

        // Check if vendor is in user's home list
        const { data: homeVendor } = await supabase
          .from("home_vendors")
          .select("id")
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

        setRating(review?.rating ? review.rating : 0);
        setComments(review?.comments || "");
        // If there's an existing review, use its anonymous setting; otherwise use user's global preference
        setShowNameInReview(review ? !review.anonymous : (userProfile?.show_name_public ?? true));

        setUseForHome(!!homeVendor);

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

  const onSubmit = async () => {
    if (!vendor) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast({ title: "Sign in required", description: "Please sign in to continue.", variant: "destructive" });
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      toast({ title: "Rating required", description: "Please select a rating from 1 to 5.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = auth.user.id;

      // Update user's global show_name_public setting if they want to show their name
      if (showNameInReview) {
        const { error: userUpdateErr } = await supabase
          .from("users")
          .update({ show_name_public: true })
          .eq("id", userId);
        
        if (userUpdateErr) {
          console.warn("[RateVendorModal] user update error (non-fatal):", userUpdateErr);
        }
      }

      // 1) Upsert review
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("vendor_id", vendor.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("reviews").update({ rating: rating, comments: comments || null, anonymous: !showNameInReview }).eq("id", existing.id);
      } else {
        await supabase.from("reviews").insert({ vendor_id: vendor.id, user_id: userId, rating: rating, comments: comments || null, anonymous: !showNameInReview });
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

      // 3) Add to home_vendors table if user selected to use this vendor
      if (useForHome) {
        const primary = (costs || []).find(c => c.cost_kind === "monthly_plan" && c.amount != null) || (costs || []).find(c => c.amount != null);
        const hv = {
          user_id: userId,
          vendor_id: vendor.id,
          my_rating: rating,
          amount: primary?.amount ?? null,
          currency: primary?.amount != null ? "USD" : null,
          period: primary?.cost_kind === "monthly_plan" ? "monthly" : (primary?.cost_kind === "hourly" ? "hourly" : null),
        } as any;
        // upsert requires unique index on (user_id, vendor_id)
        const { error: hvErr } = await supabase.from("home_vendors").upsert(hv, { onConflict: "user_id,vendor_id" });
        if (hvErr) console.warn("[RateVendorModal] home_vendors upsert error", hvErr);
      } else {
        // Remove from home_vendors if unchecked
        await supabase
          .from("home_vendors")
          .delete()
          .eq("vendor_id", vendor.id)
          .eq("user_id", userId);
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
          <DialogTitle>Rate Vendor — {vendor?.name}</DialogTitle>
        </DialogHeader>
        {vendor && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Rating</Label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className="grid gap-2">
              <Label>Comments (Additional Color)</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.currentTarget.value)} placeholder="Any helpful insights — pricing, professionalism, customer service, responsiveness — the more detailed the better for your neighbors." />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox checked={useForHome} onCheckedChange={(v) => setUseForHome(!!v)} />
                <label className="text-sm font-medium">Do you currently use this vendor for your home?</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={showNameInReview} onCheckedChange={(v) => setShowNameInReview(!!v)} />
                <label className="text-sm font-medium">Show My Name in Review</label>
              </div>
              {rating > 0 && (
                <ReviewPreview 
                  rating={rating}
                  showName={showNameInReview}
                  userName={userData?.name}
                  streetName={userData?.streetName}
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label>Costs</Label>
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