import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MobileReviewsModal } from "./MobileReviewsModal";

interface NeighborReviewPreviewProps {
  vendorId: string;
  className?: string;
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
      try {
        const { data, error } = await supabase
          .rpc("list_vendor_reviews", { _vendor_id: vendorId });
        
        if (error) {
          console.error("Review fetch error:", error);
          return [];
        }
        
        // Force all fields to be strings to prevent React rendering errors
        const sanitized = (data || []).map((item: any) => {
          // Console log to debug what we're getting
          console.log("Raw review item:", item);
          
          return {
            id: item?.id ? String(item.id) : Math.random().toString(),
            rating: typeof item?.rating === 'number' ? item.rating : 0,
            comments: item?.comments ? String(item.comments) : '',
            created_at: item?.created_at ? String(item.created_at) : '',
            // Force author_label to be a simple string
            author_label: 'Neighbor'
          };
        });
        
        return sanitized;
      } catch (err) {
        console.error("Review processing error:", err);
        return [];
      }
    },
    enabled: !!vendorId && isAuthenticated,
  });

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

  const reviews = rawData || [];
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return (
      <div className={cn("text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded", className)}>
        🌟 Be the first neighbor to review this vendor!
      </div>
    );
  }

  const reviewWithComment = reviews.find(r => r.comments && r.comments.length > 10);
  const displayReview = reviewWithComment || reviews[0];

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <div
          className={cn("bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer transition-transform hover:scale-[1.01]", className)}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-start gap-2">
            <ReviewSourceIcon source="bb" size="sm" />
            <div className="flex-1">
              {displayReview?.comments && (
                <p className="text-sm font-medium text-blue-800 mb-1">
                  💬 "{displayReview.comments.length > 60 
                    ? displayReview.comments.substring(0, 60) + "..." 
                    : displayReview.comments}" - Neighbor
                </p>
              )}
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