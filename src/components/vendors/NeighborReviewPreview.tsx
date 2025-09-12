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
  className?: string;
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
  className 
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
    if (!comment || comment.length <= 60) return comment;
    return comment.substring(0, 60) + "...";
  };

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
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
      <div className={cn("text-sm font-semibold text-yellow-800 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 p-3 rounded-lg shadow-sm", className)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span>Be the first neighbor to review this vendor!</span>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <div
          className={cn("bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-blue-300 active:scale-[0.98]", className)}
          onClick={handleInteraction}
          onKeyPress={handleInteraction}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <ReviewSourceIcon source="bb" size="md" />
            </div>
            <div className="flex-1">
              {selectedReview.comments && selectedReview.comments.trim() && (
                <div className="bg-white/60 rounded-lg p-3 mb-3 border border-blue-100">
                  <p className="text-base text-blue-800 font-medium leading-relaxed">
                    "{truncateComment(selectedReview.comments)}"
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-900">
                  - {selectedReview.author_label}
                </p>
                <div className="flex items-center gap-1">
                  <RatingStars rating={selectedReview.rating} size="sm" />
                  <span className="text-xs text-blue-700 font-medium">{selectedReview.rating}/5</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    👥 {totalReviews} neighbor{totalReviews !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-semibold">
                  <span className="text-sm">See all reviews</span>
                  <span className="text-lg">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogTrigger>
     <DialogContent className="max-w-md mx-auto">
  <DialogHeader>
    <DialogTitle>Boca Bridges Reviews</DialogTitle>
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