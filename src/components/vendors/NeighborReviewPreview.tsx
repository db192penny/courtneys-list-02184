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
import { useIsMobile } from "@/hooks/use-mobile";

interface NeighborReviewPreviewProps {
  vendorId: string;
  vendor?: {
    hoa_rating?: number;
    hoa_rating_count?: number;
  };
  onOpenModal?: () => void;
  onRate?: () => void;
  onSignUp?: () => void;
  className?: string;
  communityName?: string;
  isAuthenticated?: boolean;
  communityPhotoUrl?: string | null;
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
  onRate,
  onSignUp,
  className,
  communityName,
  isAuthenticated = false,
  communityPhotoUrl
}: NeighborReviewPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["vendor-reviews", vendorId, isAuthenticated],
    queryFn: async () => {
      const functionName = isAuthenticated ? 'list_vendor_reviews' : 'list_vendor_reviews_preview';
      const { data, error } = await supabase
        .rpc(functionName as any, { _vendor_id: vendorId });
      
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!vendorId,
  });

  // Smart review selection: prioritize recent reviews with substantial content, then ratings-only
  const selectBestReview = (reviews: Review[]): Review | null => {
    if (!reviews || reviews.length === 0) return null;
    
    // Sort by: substantial comments first, then ratings-only by date
    const sorted = [...reviews].sort((a, b) => {
      const aHasComment = a.comments && a.comments.trim().length > 10;
      const bHasComment = b.comments && b.comments.trim().length > 10;
      
      if (aHasComment && !bHasComment) return -1;
      if (!aHasComment && bHasComment) return 1;
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return sorted[0];
  };

  const formatAuthorDisplay = (authorLabel: string): string => {
    // Handle pipe-separated format: "Name|Street" or "Neighbor|Street"
    const parts = String(authorLabel).split('|');
    if (parts.length !== 2) return authorLabel;
    
    const [nameOrNeighbor, street] = parts.map(p => p.trim());
    const cleanStreet = street ? extractStreetName(street) : "";
    const formattedStreet = cleanStreet ? capitalizeStreetName(cleanStreet) : "";
    
    // Check if anonymous (already says "Neighbor")
    if (nameOrNeighbor === 'Neighbor' || nameOrNeighbor === '') {
      return formattedStreet ? `Neighbor on ${formattedStreet}` : 'Neighbor';
    }
    
    // Format real name as "FirstName L."
    const formattedName = formatNameWithLastInitial(nameOrNeighbor);
    return formattedStreet ? `${formattedName} on ${formattedStreet}` : formattedName;
  };

  const truncateComment = (comment: string) => {
    const limit = isMobile ? 140 : 250;
    if (!comment || comment.length <= limit) return { text: comment, wasTruncated: false };
    
    // Find a good breaking point near the limit (prefer word boundaries)
    let breakPoint = limit;
    for (let i = limit; i > limit - 20 && i < comment.length; i++) {
      if (comment[i] === ' ') {
        breakPoint = i;
        break;
      }
    }
    
    return { 
      text: comment.substring(0, breakPoint), 
      wasTruncated: true,
      remainingLength: comment.length - breakPoint
    };
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
      <div 
        className={cn("bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 cursor-pointer hover:scale-[1.02] hover:shadow-md hover:border-blue-300 transition-all duration-200 active:scale-[0.98]", className)}
        onClick={() => {
          if (isAuthenticated && onRate) {
            onRate();
          } else if (!isAuthenticated && onSignUp) {
            onSignUp();
          }
        }}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isAuthenticated && onRate) {
              onRate();
            } else if (!isAuthenticated && onSignUp) {
              onSignUp();
            }
          }
        }}
      >
        {/* Header with Rating Summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ReviewSourceIcon source="bb" size="md" communityPhotoUrl={communityPhotoUrl} />
            <div>
              <div className="text-sm font-bold text-blue-800">{communityName || 'Community'} Reviews</div>
              <div className="text-xs text-blue-600">From your neighbors</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <RatingStars rating={vendor?.hoa_rating || 0} />
              <span className="text-base font-bold text-blue-800">
                {vendor?.hoa_rating?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="text-sm text-blue-600 font-medium">
              {vendor?.hoa_rating_count || 0} review{(vendor?.hoa_rating_count || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        {/* Call to Action */}
        <div className="bg-white/60 rounded-lg p-3 border border-blue-100 hover:bg-white/80 transition-colors">
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
          <ReviewSourceIcon source="bb" size="md" communityPhotoUrl={communityPhotoUrl} />
          <div>
            <div className="text-sm font-bold text-blue-800">{communityName || 'Community'} Reviews</div>
            <div className="text-xs text-blue-600">From your neighbors</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <RatingStars rating={vendor?.hoa_rating || 0} />
            <span className="text-base font-bold text-blue-800">
              {vendor?.hoa_rating?.toFixed(1) || '0.0'}
            </span>
          </div>
          <div className="text-sm text-blue-600 font-medium">
            {vendor?.hoa_rating_count || 0} review{(vendor?.hoa_rating_count || 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Comment Preview with Right-aligned Attribution or Rating-only Display */}
      {selectedReview.comments && selectedReview.comments.trim() ? (
        <div className="bg-white/60 rounded-lg p-3 mb-3 border border-blue-100">
          <p className="text-base text-blue-800 font-medium leading-snug mb-2 italic">
            "{truncateComment(selectedReview.comments).text}
            {truncateComment(selectedReview.comments).wasTruncated && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleInteraction(e);
                }}
                className="inline text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors ml-1"
              >
                read more →
              </button>
            )}"
          </p>
          {/* Right-aligned attribution */}
          <div className="flex justify-end">
            <p className="text-sm font-semibold text-blue-700">
              — {formatAuthorDisplay(selectedReview.author_label)}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/60 rounded-lg p-3 mb-3 border border-blue-100 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-800 mb-2">
            <RatingStars rating={selectedReview.rating} />
            <span className="font-bold text-lg">{selectedReview.rating}/5</span>
          </div>
          <div className="text-sm text-blue-600">
            by {formatAuthorDisplay(selectedReview.author_label)}
          </div>
        </div>
      )}
      
      {/* Footer with CTA - Enhanced */}
      <div className="mt-3 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-lg p-3 border border-blue-300 hover:from-blue-300 hover:to-indigo-300 transition-all duration-200 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">👀</span>
          <span className="text-sm font-bold text-blue-900">
            {totalReviews > 1 ? `View all ${totalReviews} reviews` : 'View full review'}
          </span>
          <span className="text-blue-800">→</span>
        </div>
        <div className="text-xs text-blue-700 text-center mt-1 font-medium">
          See what neighbors are saying
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