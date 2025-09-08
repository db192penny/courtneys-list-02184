import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NeighborReviewPreviewProps {
  vendorId: string;
  className?: string;
}

export function NeighborReviewPreview({ 
  vendorId, 
  className 
}: NeighborReviewPreviewProps) {
  const { isAuthenticated } = useAuth();
  
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["vendor-reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("list_vendor_reviews", { _vendor_id: vendorId });
      
      if (error) throw error;
      return data || [];
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

  const totalReviews = reviews?.length || 0;

  if (totalReviews === 0) {
    return (
      <div className={cn("text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded", className)}>
        🌟 Be the first neighbor to review this vendor!
      </div>
    );
  }

  // Find best review with comment
  const reviewWithComment = reviews?.find((r: any) => r.comments && r.comments.length > 10);
  
  if (!reviewWithComment) {
    return (
      <div className={cn("bg-blue-50 border border-blue-200 rounded-lg p-3", className)}>
        <div className="flex items-start gap-2">
          <ReviewSourceIcon source="bb" size="sm" />
          <div className="flex-1">
            <p className="text-xs text-blue-600 font-medium">
              {totalReviews} Boca Bridges review{totalReviews > 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      </div>
    );
  }

  const comment = String(reviewWithComment.comments || '');
  const truncated = comment.length > 60 ? comment.substring(0, 60) + "..." : comment;

  return (
    <div className={cn("bg-blue-50 border border-blue-200 rounded-lg p-3", className)}>
      <div className="flex items-start gap-2">
        <ReviewSourceIcon source="bb" size="sm" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 mb-1">
            💬 "{truncated}" - Neighbor
          </p>
          <p className="text-xs text-blue-600 font-medium mt-2">
            Read all {totalReviews} Boca Bridges reviews →
          </p>
        </div>
      </div>
    </div>
  );
}