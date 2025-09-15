import { useEffect, useState, useRef } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserData } from "@/hooks/useUserData";
import ReviewPreview from "@/components/ReviewPreview";
import { useQueryClient } from "@tanstack/react-query";
import { extractStreetName } from "@/utils/address";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  isPreviewMode?: boolean;
};

export default function MobileRateVendorModal({ open, onOpenChange, vendor, onSuccess, isPreviewMode }: Props) {
  const { toast } = useToast();
  const { data: userData } = useUserData();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [showNameInReview, setShowNameInReview] = useState<boolean>(true);
  const [useForHome, setUseForHome] = useState<boolean>(true);
  const [currentUserPoints, setCurrentUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
        setShowNameInReview(review ? !review.anonymous : (userProfile?.show_name_public ?? true));
        setUseForHome(homeVendor?.id !== undefined ? !!homeVendor?.id : true);
      } catch (e) {
        console.warn("[MobileRateVendorModal] prefill error", e);
      }
    };

    prefill();
    return () => {
      isActive = false;
    };
  }, [vendor?.id]);

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Prevent iOS zoom by ensuring 16px font size
    e.target.style.fontSize = '16px';
    
    // Store original viewport position
    const originalScrollY = window.scrollY;
    
    // Prevent any automatic scrolling
    setTimeout(() => {
      window.scrollTo(0, originalScrollY);
      document.documentElement.scrollTop = originalScrollY;
      document.body.scrollTop = originalScrollY;
    }, 0);
  };

  const handleTextareaBlur = () => {
    // No special handling needed for blur
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
          console.warn("[MobileRateVendorModal] user update error (non-fatal):", userUpdateErr);
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

      // 2) Add to home_vendors table for ALL household members if user selected to use this vendor
      if (useForHome) {
        // Get user's address first
        const { data: userProfile } = await supabase
          .from("users")
          .select("address")
          .eq("id", userId)
          .single();
          
        if (userProfile?.address) {
          // Get all users at the same address
          const { data: householdUsers, error: householdError } = await supabase
            .from("users")
            .select("id")
            .eq("address", userProfile.address);
          
          if (householdError) {
            console.warn("[MobileRateVendorModal] Error fetching household users:", householdError);
          } else if (householdUsers) {
            // Create/update home_vendors entry for each household member
            for (const householdUser of householdUsers) {
              const hv = {
                user_id: householdUser.id,
                vendor_id: vendor.id,
                my_rating: rating,
                amount: null,
                currency: 'USD',
                period: "monthly",
              } as any;
              const { error: hvErr } = await supabase.from("home_vendors").upsert(hv, { onConflict: "user_id,vendor_id" });
              if (hvErr) console.warn("[MobileRateVendorModal] home_vendors upsert error", hvErr);
            }
          }
        }
      } else {
        // Remove from home_vendors for all household members if unchecked
        const { data: userProfile } = await supabase
          .from("users")
          .select("address")
          .eq("id", userId)
          .single();
          
        if (userProfile?.address) {
          const { data: householdUsers, error: householdError } = await supabase
            .from("users")
            .select("id")
            .eq("address", userProfile.address);
          
          if (!householdError && householdUsers) {
            for (const householdUser of householdUsers) {
              await supabase
                .from("home_vendors")
                .delete()
                .eq("vendor_id", vendor.id)
                .eq("user_id", householdUser.id);
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
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "community-stats" 
      });
      
      // Calculate points to Starbucks for dynamic message
      const newPointsTotal = currentUserPoints + 5; // They just earned 5 points
      const pointsToStarbucks = Math.max(20 - newPointsTotal, 0);
      const starbucksMessage = pointsToStarbucks > 0 
        ? `${pointsToStarbucks} points to Starbucks gift card!` 
        : "Starbucks card earned! ☕";
      
      toast({ 
        title: "🎉 Review Added! +5 Points", 
        description: `${starbucksMessage} • Help neighbors with more reviews!`,
        duration: 5000,
        className: "bg-green-50 border-green-500 border-2 text-green-900"
      });
      
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
              height: '85vh',
              maxHeight: '85vh',
              position: 'fixed',
              touchAction: 'pan-y'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="text-left p-4 pb-4 flex-shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Rate Vendor — {vendor?.name}</h2>
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
                      <Label>Rating</Label>
                      <div className="flex justify-center">
                        <StarRating value={rating} onChange={setRating} size="lg" />
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      <Label>Comments (Additional Color)</Label>
                      <Textarea 
                        ref={textareaRef}
                        value={comments} 
                        onChange={(e) => setComments(e.currentTarget.value)} 
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                        placeholder="Any helpful insights — pricing, professionalism, customer service, responsiveness — the more detailed the better for your neighbors."
                        className="min-h-[100px] resize-none"
                        style={{ 
                          fontSize: '16px',
                          maxHeight: '120px'
                        }}
                        rows={4}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                        <Checkbox 
                          checked={useForHome} 
                          onCheckedChange={(v) => setUseForHome(!!v)}
                          className="mt-0.5" 
                        />
                        <label className="text-sm font-medium leading-relaxed">
                          Do you currently use this vendor for your home?
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                        <Checkbox 
                          checked={showNameInReview} 
                          onCheckedChange={(v) => setShowNameInReview(!!v)}
                          className="mt-0.5"
                        />
                        <label className="text-sm font-medium leading-relaxed">
                          Show My Name in Review
                        </label>
                      </div>
                      
                      <div className="p-3 bg-background border rounded-lg">
                        <ReviewPreview 
                          rating={rating}
                          showName={showNameInReview}
                          userName={userData?.name}
                          streetName={userData?.streetName ? extractStreetName(userData.streetName) : undefined}
                        />
                      </div>
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