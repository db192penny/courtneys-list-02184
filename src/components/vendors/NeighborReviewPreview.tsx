import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RatingStars } from "@/components/ui/rating-stars";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";
import { extractStreetName, capitalizeStreetName } from "@/utils/address";
import { cn } from "@/lib/utils";

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

  const formatDisplayName = (authorLabel: string) => {
    return authorLabel || "Neighbor";
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

  if (!selectedReview) {
    return (
      <div className={cn("text-xs text-muted-foreground italic bg-yellow-50 border border-yellow-200 p-2 rounded", className)}>
        🌟 Be the first to share your experience!
      </div>
    );
  }

  return (
    <div className={cn("space-y-1 bg-gray-50 border border-gray-200 p-2 rounded", className)}>
      <div className="flex items-center gap-1.5">
        <RatingStars rating={selectedReview.rating} size="sm" />
        <ReviewSourceIcon source="bb" size="sm" />
      </div>
      
      {selectedReview.comments && selectedReview.comments.trim() && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          "{selectedReview.comments.trim()}"
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        — {formatDisplayName(selectedReview.author_label)}
      </p>
    </div>
  );
}