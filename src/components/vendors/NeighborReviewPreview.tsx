import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { MobileReviewsModal } from "./MobileReviewsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  anonymous?: boolean;
}

export function NeighborReviewPreview({ 
  vendorId, 
  className 
}: NeighborReviewPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["vendor-reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("list_vendor_reviews", { _vendor_id: vendorId });
      
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!vendorId,
  });

  // SAFE formatting function
  const formatAuthorLabel = (review: Review): string => {
    try {
      // Always return a string
      if (!review.author_label) return 'Neighbor';
      
      const authorStr = String(review.author_label);
      
      // Parse the name|street format
      if (authorStr.includes('|')) {
        const [namePart, streetPart] = authorStr.split('|');
        const name = namePart?.trim() || 'Neighbor';
        const street = streetPart?.trim() || '';
        
        if (review.anonymous) {
          return street ? `Neighbor on ${street}` : 'Neighbor';
        } else {
          // Format name with last initial
          const nameParts = name.split(' ').filter(Boolean);
          if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : '';
            const formatted = `${firstName} ${lastInitial}`;
            return street ? `${formatted} on ${street}` : formatted;
          }
          return street ? `${name} on ${street}` : name;
        }
      }
      
      // Fallback for old format or plain name
      return authorStr;
    } catch (err) {
      console.error('Error formatting author label:', err);
      return 'Neighbor';
    }
  };

  const reviews = rawData?.map(review => ({
    ...review,
    author_label: formatAuthorLabel(review)
  }));

  // Smart review selection
  const selectBestReview = (reviews: Review[]): Review | null => {
    if (!reviews || reviews.length === 0) return null;
    
    const sorted = [...reviews].sort((a, b) => {
      const aHasComment = a.comments && a.comments.trim().length > 10;
      const bHasComment = b.comments && b.comments.trim().length > 10;
      
      if (aHasComment && !bHasComment) return -1;
      if (!aHasComment && bHasComment) return 1;
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return sorted[0];
  };

  const truncateComment = (comment: string | null): string => {
    if (!comment) return '';
    const str = String(comment);
    if (str.length <= 60) return str;
    return str.substring(0, 60) + "...";
  };

  const handleInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className={cn("bg-yellow-50 border border-yellow-200 rounded-lg p-3", className)}>
        <p className="text-sm font-medium text-yellow-700">
          🔒 Sign up to see neighbor reviews
        </p>
      </div>
    );
  }

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
                💬 "{truncateComment(selectedReview.comments)}" - {selectedReview.author_label}
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