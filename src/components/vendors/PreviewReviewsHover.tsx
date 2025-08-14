import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDistanceToNow } from "date-fns";
import { usePreviewSession } from "@/hooks/usePreviewSession";

interface PreviewReview {
  id: string;
  rating: number;
  comments?: string;
  created_at: string;
  anonymous: boolean;
  session_id: string;
}

interface PreviewSession {
  name: string;
  street_name?: string;
}

export default function PreviewReviewsHover({ 
  vendorId, 
  children 
}: { 
  vendorId: string; 
  children: ReactNode;
}) {
  const { session: currentSession } = usePreviewSession();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["preview-vendor-reviews", vendorId],
    queryFn: async () => {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("preview_reviews")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (reviewsError) {
        console.error("Failed to fetch preview reviews:", reviewsError);
        return [];
      }

      // Get unique session IDs
      const sessionIds = [...new Set(reviewsData?.map(r => r.session_id) || [])];
      
      // Fetch session data for author labels
      const { data: sessionsData } = await supabase
        .from("preview_sessions")
        .select("id, name, street_name")
        .in("id", sessionIds);

      const sessionsMap = new Map(sessionsData?.map(s => [s.id, s]) || []);

      // Combine reviews with session data
      return reviewsData?.map(review => ({
        ...review,
        session: sessionsMap.get(review.session_id)
      })) || [];
    },
    enabled: !!vendorId,
  });

  const getAuthorLabel = (review: any) => {
    if (review.anonymous || !review.session?.name) {
      return "Neighbor";
    }
    
    const name = review.session.name.trim();
    const street = review.session.street_name;
    
    let displayName;
    if (name.includes(' ')) {
      const parts = name.split(' ');
      displayName = `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    } else {
      displayName = name;
    }
    
    return street ? `${displayName} on ${street}` : displayName;
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Community Reviews</h4>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading reviews...</p>
          ) : reviews && reviews.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="border-b border-border pb-2 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <RatingStars rating={review.rating} size="sm" />
                    <span className="text-xs font-medium">{getAuthorLabel(review)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {review.comments && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {review.comments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No reviews yet. Be the first to rate this vendor!</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}