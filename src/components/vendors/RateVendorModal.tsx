import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TrackingButton } from "@/components/analytics/TrackingButton";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { useUserData } from "@/hooks/useUserData";
import ReviewPreview from "@/components/ReviewPreview";
import { useQueryClient } from "@tanstack/react-query";
import { extractStreetName } from "@/utils/address";
import { generatePointSuggestion, getInviteGuidance } from "@/utils/pointSuggestions";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  isPreviewMode?: boolean;
};

export default function RateVendorModal({ open, onOpenChange, vendor, onSuccess, isPreviewMode }: Props) {
  const { toast } = useToast();
  const { data: userData } = useUserData();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [showNameInReview, setShowNameInReview] = useState<boolean>(true);
  const [useForHome, setUseForHome] = useState<boolean>(true);
  const [currentUserPoints, setCurrentUserPoints] = useState<number>(0);
  
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

        // Get user's current show_name_public setting and points
        const { data: userProfile } = await supabase
          .from("users")
          .select("show_name_public, points")
          .eq("id", user.id)
          .maybeSingle();
        
        // Store current points for toast calculation
        if (userProfile?.points !== undefined) {
          setCurrentUserPoints(userProfile.points);
        }

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

        // Set useForHome - default to true for new users, respect existing preference
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

  const getRatingPrompt = (rating: number): string => {
    switch(rating) {
      case 5: return "Tell neighbors why they'll love this vendor!";
      case 4: return "What made this service good but not perfect?";
      case 3: return "Help others understand your mixed experience";
      case 2: return "What went wrong? Your neighbors need to know";
      case 1: return "Warn your neighbors - what happened?";
      default: return "";
    }
  };

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
    
    if (!comments.trim()) {
      toast({ 
        title: "Comment required", 
        description: "Please add a comment to help your neighbors make informed decisions!", 
        variant: "destructive"
      });
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
        await supabase.from("reviews").update({ rating: rating, comments: comments || null, anonymous: !showNameInReview }).eq("id", existing.id);
      } else {
        await supabase.from("reviews").insert({ vendor_id: vendor.id, user_id: userId, rating: rating, comments: comments || null, anonymous: !showNameInReview });
      }

      // 2) Handle home_vendors table - add for ALL users at this address
      if (useForHome) {
        console.log("[RateVendorModal] Adding to home vendors for all household members...");
        
        if (!userData?.address) {
          toast({ title: "Error", description: "Unable to determine your address", variant: "destructive" });
          return;
        }
        
        // Get all users at the same address
        const { data: householdUsers, error: householdError } = await supabase
          .from("users")
          .select("id")
          .eq("address", userData.address);
        
        if (householdError) {
          console.warn("[RateVendorModal] Error fetching household users:", householdError);
        } else if (householdUsers) {
          // Create/update home_vendors entry for each household member
          for (const householdUser of householdUsers) {
            const { data: existingHomeVendor } = await supabase
              .from("home_vendors")
              .select("id")
              .eq("user_id", householdUser.id)
              .eq("vendor_id", vendor.id)
              .maybeSingle();

            if (existingHomeVendor) {
              // Update existing entry
              const { error: updateErr } = await supabase
                .from("home_vendors")
                .update({ my_rating: rating })
                .eq("id", existingHomeVendor.id);
              
              if (updateErr) {
                console.warn("[RateVendorModal] home_vendors update error:", updateErr);
              }
            } else {
              // Create new entry
              const hv = {
                user_id: householdUser.id,
                vendor_id: vendor.id,
                amount: null,
                currency: 'USD',
                period: 'monthly',
                my_rating: rating,
                my_comments: comments,
                share_review_public: !showNameInReview,
              };
              
              const { error: insertErr } = await supabase
                .from("home_vendors")
                .insert(hv);
              
              if (insertErr) {
                console.error("[RateVendorModal] home_vendors insert error:", insertErr);
              }
            }
          }
        }
      } else {
        // Remove from home_vendors for all household members if unchecked
        console.log("[RateVendorModal] Removing home vendor entry for all household members...");
        
        if (userData?.address) {
          // Get all users at the same address
          const { data: householdUsers, error: householdError } = await supabase
            .from("users")
            .select("id")
            .eq("address", userData.address);
          
          if (householdError) {
            console.warn("[RateVendorModal] Error fetching household users:", householdError);
          } else if (householdUsers) {
            // Remove home_vendors entry for each household member
            for (const householdUser of householdUsers) {
              const { error: deleteErr } = await supabase
                .from("home_vendors")
                .delete()
                .eq("user_id", householdUser.id)
                .eq("vendor_id", vendor.id);
              
              if (deleteErr) {
                console.warn("[RateVendorModal] home_vendors delete error:", deleteErr);
              }
            }
          }
        }
      }

      // Invalidate relevant caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["reviews-hover"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
      queryClient.invalidateQueries({ queryKey: ["community-vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-costs"] });
      queryClient.invalidateQueries({ queryKey: ["user-home-vendors"] });
      // Use wildcard to invalidate all community-specific queries
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "community-stats" 
      });
      
      // Calculate smart suggestion for earning Starbucks points
      const newPointsTotal = currentUserPoints + 5; // They just earned 5 points
      const suggestion = generatePointSuggestion(newPointsTotal);
      
      // Build the description with navigation guidance if needed
      let description = suggestion.message;
      if (suggestion.includeInviteGuidance) {
        description += ` ${getInviteGuidance(isMobile)}`;
      }
      
      toast({ 
        title: "🎉 Review Added! +5 Points", 
        description,
        duration: 6000, // Slightly longer to read navigation guidance
        className: "bg-green-50 border-green-500 border-2 text-green-900"
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      console.error("[RateVendorModal] Submit error:", e);
      toast({ title: "Error", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ touchAction: 'manipulation' }}>
        <DialogHeader>
          <DialogTitle>Rate Vendor — {vendor?.name}</DialogTitle>
        </DialogHeader>
        {vendor && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Rating</Label>
              <StarRating value={rating} onChange={setRating} />
          </div>

          {rating > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2 text-sm text-blue-700">
                <span className="text-base">💬</span>
                <span className="font-medium">{getRatingPrompt(rating)}</span>
              </div>
            </div>
          )}

          <div className="grid gap-2">
              <label className="block text-sm font-medium mb-2">
                Comments * (required to help neighbors)
              </label>
              <Textarea 
                value={comments} 
                onChange={(e) => setComments(e.currentTarget.value)} 
                onFocus={(e) => {
                  // Prevent iOS zoom and unwanted scrolling
                  e.target.style.fontSize = '16px';
                  setTimeout(() => {
                    e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                  }, 100);
                }}
                placeholder={rating ? "Share your experience to help neighbors make informed decisions" : "Select a rating first"}
                className="min-h-[100px]"
                style={{ 
                  fontSize: '16px',
                  touchAction: 'manipulation'
                }}
              />
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
                streetName={userData?.streetName ? extractStreetName(userData.streetName) : undefined}
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <TrackingButton 
                variant="secondary" 
                onClick={() => onOpenChange(false)} 
                disabled={loading}
                eventName="rate_vendor_cancel"
                vendorId={vendor.id}
                category={vendor.category}
              >
                Cancel
              </TrackingButton>
              <TrackingButton 
                onClick={onSubmit} 
                disabled={loading || !rating || !comments.trim()}
                eventName="rate_vendor_submit"
                vendorId={vendor.id}
                category={vendor.category}
                metadata={{ rating, hasComments: !!comments }}
              >
                {loading ? "Saving..." : "Save Review"}
              </TrackingButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
