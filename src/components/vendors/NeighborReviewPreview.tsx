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
import { useAuth } from "@/hooks/useAuth";

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
  const { isAuthenticated } = useAuth();
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

  if (!isAuthenticated) {
    return (
      <div className={cn("bg-yellow-50 border border-yellow-200 rounded-lg p-3", className)}>
        <p className="text-sm font-medium text-yellow-700">
          🔒 Sign up to see neighbor reviews
        </p>
      </div>
    );
  }

  if (!selectedReview) {
    return (
      <div className={cn("text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded", className)}>
        🌟 Be the first neighbor to review this vendor!
      </div>
    );
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <div
          className={cn("bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer transition-transform hover:scale-[1.01]", className)}
          onClick={handleInteraction}
          onKeyPress={handleInteraction}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-start gap-2">
            <ReviewSourceIcon source="bb" size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 mb-1">
                💬 "{truncateComment(selectedReview.comments || "")}" - {selectedReview.author_label}
              </p>
              <p className="text-xs text-blue-600 font-medium mt-2">
                Read all {totalReviews} Boca Bridges reviews →
              </p>
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Boca Bridges Reviews</DialogTitle>
        </DialogHeader>
        <MobileReviewsModal vendorId={vendorId} />
      </DialogContent>
    </Dialog>
  );
}