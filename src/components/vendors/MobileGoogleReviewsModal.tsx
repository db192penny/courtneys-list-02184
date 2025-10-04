import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type GoogleReview = {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
};

interface MobileGoogleReviewsModalProps {
  vendorId: string;
  googleReviewsJson: any;
  googlePlaceId: string | null;
}

export function MobileGoogleReviewsModal({ 
  vendorId, 
  googleReviewsJson, 
  googlePlaceId 
}: MobileGoogleReviewsModalProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Parse existing Google reviews from the vendor data
  const existingReviews: GoogleReview[] = Array.isArray(googleReviewsJson) 
    ? googleReviewsJson 
    : [];

  const { data: freshReviews, refetch } = useQuery({
    queryKey: ["mobile-google-reviews", vendorId],
    queryFn: async () => {
      if (!googlePlaceId) throw new Error("No Google Place ID");
      
      const { data, error } = await supabase.functions.invoke("fetch-google-place-details", {
        body: { place_id: googlePlaceId }
      });
      
      if (error) throw error;
      return data?.reviews || [];
    },
    enabled: false, // Only fetch when manually triggered
  });

  const handleRefresh = async () => {
    if (!googlePlaceId) return;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Use fresh reviews if available and successful refresh, otherwise use existing reviews
  const reviews: GoogleReview[] = (freshReviews && freshReviews.length > 0) ? freshReviews : existingReviews;

  if (!googlePlaceId) {
    return <div className="text-sm text-muted-foreground p-4">No Google Place ID available.</div>;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-end mb-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {reviews.length === 0 && (
        <div className="text-sm text-muted-foreground">No Google reviews available.</div>
      )}
      
      {reviews.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-3">
          {reviews.slice(0, 5).map((review, index) => (
            <div key={index} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium text-xs">{review.rating}/5</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {review.relative_time_description}
                </span>
              </div>
              <div className="text-xs font-medium text-foreground mb-2">
                {review.author_name}
              </div>
              {review.text && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.text.length > 200 
                    ? `${review.text.substring(0, 200)}...` 
                    : review.text
                  }
                </p>
              )}
            </div>
          ))}
          {reviews.length > 5 && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Showing 5 of {reviews.length} reviews
            </div>
          )}
        </div>
      )}
    </div>
  );
}