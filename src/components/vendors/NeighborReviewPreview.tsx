import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RatingStars } from "@/components/ui/rating-stars";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { MobileReviewsModal } from "./MobileReviewsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";
import { extractStreetName, capitalizeStreetName } from "@/utils/address";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NeighborReviewPreviewProps {
  vendorId: string;
  vendor?: {
    hoa_rating?: number;
    hoa_rating_count?: number;
  };
  onOpenModal?: () => void;
  className?: string;
  communityName?: string;
}

interface Review {
  id: string;
  rating: number;
  comments: string | null;
  created_at: string;
  author_label: string;
}

export function NeighborReviewPreview({ 
  vendorId, 
  vendor,
  onOpenModal,
  className,
  communityName 
}: NeighborReviewPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["vendor-reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("list_vendor_reviews", { _vendor_id: vendorId });
      
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!vendorId,
  });

  // Smart review selection: prioritize recent reviews with substantial content
  const selectBestReview = (reviews: Review[]): Review | null => {
    if (!reviews || reviews.length === 0) return null;
    
    // Sort by: substantial comments first, then by date
    const sorted = [...reviews].sort((a, b) => {
      const aHasComment = a.comments && a.comments.trim().length > 10;
      const bHasComment = b.comments && b.comments.trim().length > 10;
      
      if (aHasComment && !bHasComment) return -1;
      if (!aHasComment && bHasComment) return 1;
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return sorted[0];
  };

  const truncateComment = (comment: string) => {
    if (!comment || comment.length <= 140) return comment;
    return comment.substring(0, 140) + "...";
  };

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (onOpenModal) {
      onOpenModal();
    } else {
      setIsModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        Loading reviews...
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        Unable to load reviews
      </div>
    );
  }

  const selectedReview = selectBestReview(reviews || []);
  const totalReviews = reviews?.length || 0;

  if (!selectedReview) {
    return (
      <div className={cn("bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4", className)}>
        {/* Header with Rating Summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ReviewSourceIcon source="bb" size="md" />
            <div>
              <div className="text-sm font-bold text-blue-800">{communityName || 'Community'} Reviews</div>
              <div className="text-xs text-blue-600">From your neighbors</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <RatingStars rating={vendor?.hoa_rating || 0} size="sm" />
              <span className="text-sm font-bold text-blue-800">
                {vendor?.hoa_rating?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="text-xs text-blue-600 font-medium">
              {vendor?.hoa_rating_count || 0} review{(vendor?.hoa_rating_count || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        {/* Call to Action */}
        <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="text-lg">⭐</span>
            <span className="text-sm font-semibold">Be the first neighbor to review this vendor!</span>
          </div>
        </div>
      </div>
    );
  }

  const TriggerContent = () => (
    <div
      className={cn("bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-blue-300 active:scale-[0.98]", className)}
      onClick={handleInteraction}
      onKeyPress={handleInteraction}
      role="button"
      tabIndex={0}
    >
      {/* Header with Rating Summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ReviewSourceIcon source="bb" size="md" />
          <div>
            <div className="text-sm font-bold text-blue-800">{communityName || 'Community'} Reviews</div>
            <div className="text-xs text-blue-600">From your neighbors</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <RatingStars rating={vendor?.hoa_rating || 0} size="sm" />
            <span className="text-sm font-bold text-blue-800">
              {vendor?.hoa_rating?.toFixed(1) || '0.0'}
            </span>
          </div>
          <div className="text-xs text-blue-600 font-medium">
            {vendor?.hoa_rating_count || 0} review{(vendor?.hoa_rating_count || 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Comment Preview with Right-aligned Attribution */}
      {selectedReview.comments && selectedReview.comments.trim() && (
        <div className="bg-white/60 rounded-lg p-3 mb-3 border border-blue-100">
          <p className="text-sm text-blue-800 font-medium leading-snug mb-2 italic">
            "{truncateComment(selectedReview.comments)}"
          </p>
          {/* Right-aligned attribution */}
          <div className="flex justify-end">
            <p className="text-xs font-medium text-blue-600">
              — {selectedReview.author_label}
            </p>
          </div>
        </div>
      )}
      
      {/* Footer with CTA */}
      <div className="mt-3 flex items-center justify-end">
        <div className="flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
          <span className="text-sm">View all reviews</span>
          <span className="text-lg">→</span>
        </div>
      </div>
    </div>
  );

  if (onOpenModal) {
    // When used inside VendorMobileCard, just render the trigger content
    return <TriggerContent />;
  }

  // Standalone usage with its own modal
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <TriggerContent />
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Boca Bridges</DialogTitle>
        </DialogHeader>
        <MobileReviewsModal 
          open={true}
          onOpenChange={() => {}}
          vendor={{ id: vendorId }}
          onRate={() => {}}
        />
      </DialogContent>
    </Dialog>
  );
}