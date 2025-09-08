import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RatingStars } from "@/components/ui/rating-stars";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MobileReviewsModal } from "./MobileReviewsModal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DesktopReviewPreviewProps {
  vendorId: string;
  communityRating?: number;
  communityRatingCount?: number;
  googleRating?: number;
  googleRatingCount?: number;
  className?: string;
}

interface Review {
  id: string;
  rating: number;
  comments: string | null;
  created_at: string;
  author_label: string;
}

export function DesktopReviewPreview({ 
  vendorId, 
  communityRating,
  communityRatingCount,
  googleRating,
  googleRatingCount,
  className 
}: DesktopReviewPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: reviews, isLoading } = useQuery({
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
  const selectBestReviews = (reviews: Review[]): Review[] => {
    if (!reviews || reviews.length === 0) return [];
    
    // Sort by: substantial comments first, then by date
    const sorted = [...reviews].sort((a, b) => {
      const aHasComment = a.comments && a.comments.trim().length > 10;
      const bHasComment = b.comments && b.comments.trim().length > 10;
      
      if (aHasComment && !bHasComment) return -1;
      if (!aHasComment && bHasComment) return 1;
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    // Return up to 2 reviews for desktop
    return sorted.slice(0, 2);
  };

  const truncateComment = (comment: string) => {
    if (!comment || comment.length <= 120) return comment;
    // Smart word boundary truncation
    const truncated = comment.substring(0, 120);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 100 ? truncated.substring(0, lastSpace) : truncated) + "...";
  };

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const selectedReviews = selectBestReviews(reviews || []);
  const totalReviews = reviews?.length || 0;
  const hasReviews = selectedReviews.length > 0;

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className={cn("space-y-2 min-w-[280px]", className)}>
        {/* Primary: Boca Bridges Reviews */}
        <DialogTrigger asChild>
          <div
            className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 cursor-pointer transition-all hover:bg-blue-100 hover:shadow-sm"
            onClick={handleInteraction}
            onKeyPress={handleInteraction}
            role="button"
            tabIndex={0}
          >
            {hasReviews ? (
              <div className="space-y-2">
                {selectedReviews.map((review, index) => (
                  <div key={review.id}>
                    {index > 0 && <div className="h-px bg-blue-200 my-2"></div>}
                    <div className="text-sm font-medium text-blue-800">
                      💬 "{truncateComment(review.comments || "")}" - {review.author_label}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-600 text-white text-xs">BB</Badge>
                    {communityRating && (
                      <RatingStars rating={communityRating} showValue className="text-xs" />
                    )}
                    {communityRatingCount && (
                      <span className="text-xs text-blue-700">({communityRatingCount})</span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 font-medium">
                    Read all {totalReviews} reviews →
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-blue-800 mb-2">
                  🌟 Be the first neighbor to review this vendor!
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-600 text-white text-xs">BB</Badge>
                    <span className="text-xs text-blue-700">No ratings yet</span>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">
                    Share your experience →
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogTrigger>

        {/* Secondary: Google Reviews */}
        {googleRating && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReviewSourceIcon source="google" size="sm" />
                <RatingStars rating={googleRating} showValue className="text-xs" />
                {googleRatingCount && (
                  <span className="text-xs text-green-700">({googleRatingCount})</span>
                )}
              </div>
              <span className="text-xs text-green-600 uppercase font-medium tracking-wide">
                Google
              </span>
            </div>
          </div>
        )}
      </div>

      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Community Reviews</DialogTitle>
        </DialogHeader>
        <MobileReviewsModal 
          open={true}
          onOpenChange={() => {}}
          vendor={{ id: vendorId }}
        />
      </DialogContent>
    </Dialog>
  );
}