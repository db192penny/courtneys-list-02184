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
  anonymous: boolean;
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
      
      // FIX: Ensure all fields are safe to render
      return (data || []).map((item: any) => ({
        id: String(item?.id || ''),
        rating: Number(item?.rating || 0),
        comments: item?.comments ? String(item.comments) : null,
        created_at: String(item?.created_at || ''),
        author_label: String(item?.author_label || 'Neighbor'),
        anonymous: Boolean(item?.anonymous)
      })) as Review[];
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

  const totalReviews = reviews?.length || 0;

  if (totalReviews === 0) {
    return (
      <div className={cn("text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded", className)}>
        🌟 Be the first neighbor to review this vendor!
      </div>
    );
  }

  const reviewWithComment = reviews?.find(r => r.comments && r.comments.length > 10);
  const selectedReview = reviewWithComment || reviews[0];

  const truncateComment = (comment: string | null) => {
    if (!comment) return '';
    return comment.length > 60 ? comment.substring(0, 60) + "..." : comment;
  };

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