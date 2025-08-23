import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "@/components/ui/star-rating";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePreviewSession } from "@/hooks/usePreviewSession";
import IdentityGateModal from "@/components/preview/IdentityGateModal";
import ReviewPreview from "@/components/ReviewPreview";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  communityName?: string;
}

export default function PreviewRateVendorModal({ open, onOpenChange, vendor, onSuccess, communityName }: Props) {
  const { session, createSession, trackEvent, getAuthorLabel } = usePreviewSession();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [showNameInReview, setShowNameInReview] = useState(true);
  const [useForHome, setUseForHome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showIdentityGate, setShowIdentityGate] = useState(false);

  // Check if we need to show identity gate on first open
  useEffect(() => {
    if (open && vendor && !session) {
      setShowIdentityGate(true);
    }
  }, [open, vendor, session]);

  // Clear form when modal closes
  useEffect(() => {
    if (!open) {
      setRating(0);
      setComments("");
      setShowNameInReview(true);
      setUseForHome(true);
    }
  }, [open]);

  // Prefill existing review if available
  useEffect(() => {
    if (!open || !vendor || !session) return;

    const prefillData = async () => {
      try {
        const { data: existingReview } = await supabase
          .from("preview_reviews")
          .select("*")
          .eq("vendor_id", vendor.id)
          .eq("session_id", session.id)
          .maybeSingle();

        if (existingReview) {
          setRating(existingReview.rating);
          setComments(existingReview.comments || "");
          setShowNameInReview(!existingReview.anonymous);
          // For preview, we store the useForHome preference in the review comments field as metadata
          // But for simplicity, let's just default to true for new users
          setUseForHome(true);
        } else {
          // Default to true for new preview users
          setUseForHome(true);
        }
      } catch (error) {
        console.warn("Failed to prefill review data:", error);
      }
    };

    prefillData();
  }, [open, vendor, session]);

  const handleIdentitySuccess = async (sessionData: any) => {
    try {
      await createSession(sessionData);
      setShowIdentityGate(false);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const onSubmit = async () => {
    if (!vendor || !session) return;

    if (rating < 1 || rating > 5) {
      toast({
        title: "Rating Required",
        description: "Please provide a rating between 1 and 5 stars.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upsert the review
      const { error } = await supabase
        .from("preview_reviews")
        .upsert({
          vendor_id: vendor.id,
          session_id: session.id,
          rating,
          comments: comments.trim() || null,
          recommended: rating >= 4,
          anonymous: !showNameInReview,
        }, {
          onConflict: "vendor_id,session_id"
        });

      if (error) throw error;

      // Note: Preview mode doesn't persist home vendor preferences to database
      // This checkbox is just for UI consistency with the main rating modals

      // Track the event
      await trackEvent("rate_vendor", vendor.id, {
        rating,
        vendor_name: vendor.name,
        vendor_category: vendor.category,
        use_for_home: useForHome,
      });

      // Invalidate relevant caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
      queryClient.invalidateQueries({ queryKey: ["reviews-hover"] });

      toast({
        title: "Review Saved",
        description: "Thank you for sharing your experience!",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Failed to save review:", error);
      toast({
        title: "Error",
        description: "Failed to save review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showIdentityGate && vendor) {
    return (
      <IdentityGateModal
        open={showIdentityGate}
        onOpenChange={setShowIdentityGate}
        community={communityName || vendor.category}
        onSuccess={handleIdentitySuccess}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ touchAction: 'manipulation' }}
      >
        <DialogHeader>
          <DialogTitle>Rate {vendor?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rating">Your Rating *</Label>
            <div className="flex justify-center">
              <StarRating
                value={rating}
                onChange={setRating}
                size="lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              onFocus={(e) => {
                // Prevent iOS zoom and unwanted scrolling
                e.target.style.fontSize = '16px';
                setTimeout(() => {
                  e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 100);
              }}
              placeholder="Share your experience with this provider..."
              className="min-h-[100px]"
              style={{ 
                fontSize: '16px',
                touchAction: 'manipulation'
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useForHome"
                checked={useForHome}
                onCheckedChange={(checked) => setUseForHome(!!checked)}
              />
              <Label
                htmlFor="useForHome"
                className="text-sm font-normal cursor-pointer"
              >
                Do you currently use this vendor for your home?
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showName"
                checked={showNameInReview}
                onCheckedChange={(checked) => setShowNameInReview(!!checked)}
              />
              <Label
                htmlFor="showName"
                className="text-sm font-normal cursor-pointer"
              >
                Show my name in this review
              </Label>
            </div>
          </div>

          {rating > 0 && (
            <div className="border rounded-md p-4 bg-muted/30">
              <h4 className="text-sm font-medium mb-2">Preview:</h4>
              <ReviewPreview
                rating={rating}
                showName={showNameInReview}
                userName={showNameInReview ? getAuthorLabel() : "Neighbor"}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading || rating === 0}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}