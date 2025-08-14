import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { useUserData } from "@/hooks/useUserData";
import ReviewPreview from "@/components/ReviewPreview";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
};

export default function RateVendorModal({ open, onOpenChange, vendor, onSuccess }: Props) {
  const { toast } = useToast();
  const { data: userData } = useUserData();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [showNameInReview, setShowNameInReview] = useState<boolean>(true);
  const [useForHome, setUseForHome] = useState<boolean>(true);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const prefill = async () => {
      if (!vendor) {
        setRating(0);
        setComments("");
        setShowNameInReview(true);
        setUseForHome(true);
        return;
      }

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setRating(0);
          setComments("");
          setShowNameInReview(true);
          setUseForHome(true);
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

        if (!isActive) return;

        setRating(review?.rating ? review.rating : 0);
        setComments(review?.comments || "");
        // If there's an existing review, use its anonymous setting; otherwise use user's global preference
        setShowNameInReview(review ? !review.anonymous : (userProfile?.show_name_public ?? true));

        // Default to true for "use for home" - user should be using vendor they're rating
        setUseForHome(homeVendor?.id !== undefined ? !!homeVendor?.id : true);
      } catch (e) {
        console.warn("[RateVendorModal] prefill error", e);
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

      // 2) Add to home_vendors table if user selected to use this vendor
      if (useForHome) {
        const hv = {
          user_id: userId,
          vendor_id: vendor.id,
          my_rating: rating,
          amount: null,
          currency: null,
          period: "monthly",
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

      // Invalidate relevant caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["reviews-hover"] });
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
      queryClient.invalidateQueries({ queryKey: ["community-vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-costs"] });
      queryClient.invalidateQueries({ queryKey: ["user-home-vendors"] });
      // Use wildcard to invalidate all community-specific queries
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "community-stats" 
      });
      
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
              <ReviewPreview 
                rating={rating}
                showName={showNameInReview}
                userName={userData?.name}
                streetName={userData?.streetName}
              />
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