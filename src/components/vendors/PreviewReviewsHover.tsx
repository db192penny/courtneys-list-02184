import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDistanceToNow } from "date-fns";
import { usePreviewSession } from "@/hooks/usePreviewSession";
import { capitalizeStreetName, extractStreetName } from "@/utils/address";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";

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
      let formattedRealReviews: any[] = [];
      
      // Try to fetch real reviews, but handle RLS errors gracefully
      try {
        const realReviewsResponse = await supabase
          .from("reviews")
          .select(`
            id,
            rating,
            recommended,
            comments,
            created_at,
            anonymous,
            users!inner(name, street_name, show_name_public)
          `)
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false });

        if (!realReviewsResponse.error) {
          const realReviews = realReviewsResponse.data || [];
          formattedRealReviews = realReviews.map((review: any) => {
            // Generate author label similar to the RPC function
            const user = review.users;
            let authorLabel = "Neighbor";
            
            if (!review.anonymous && user?.show_name_public && user?.name?.trim()) {
              const formattedName = formatNameWithLastInitial(user.name.trim());
              authorLabel = formattedName;
              
              if (user.street_name?.trim()) {
                const cleanStreet = capitalizeStreetName(extractStreetName(user.street_name.trim()));
                authorLabel += ` on ${cleanStreet}`;
              }
            }

            return {
              id: review.id,
              rating: review.rating,
              comments: review.comments,
              created_at: review.created_at,
              anonymous: review.anonymous,
              author_label: authorLabel,
              type: 'real'
            };
          });
        }
      } catch (error) {
        // Silently handle RLS errors for logged-out users
        console.log("Cannot fetch real reviews (user not authenticated)");
      }

      // Fetch preview reviews (always accessible)
      const previewReviewsResponse = await supabase
        .from("preview_reviews")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (previewReviewsResponse.error) {
        console.error("Failed to fetch preview reviews:", previewReviewsResponse.error);
        return formattedRealReviews;
      }

      const previewReviewsData = previewReviewsResponse.data || [];
      
      // Get unique session IDs for preview reviews
      const sessionIds = [...new Set(previewReviewsData.map(r => r.session_id))];
      
      // Fetch session data for author labels
      const { data: sessionsData } = await supabase
        .from("preview_sessions")
        .select("id, name, street_name")
        .in("id", sessionIds);

      const sessionsMap = new Map(sessionsData?.map(s => [s.id, s]) || []);

      // Format preview reviews
      const formattedPreviewReviews = previewReviewsData.map(review => ({
        id: `preview-${review.id}`,
        rating: review.rating,
        comments: review.comments,
        created_at: review.created_at,
        anonymous: review.anonymous,
        session: sessionsMap.get(review.session_id),
        type: 'preview'
      }));

      // Combine both types of reviews and sort by creation date
      const allReviews = [...formattedRealReviews, ...formattedPreviewReviews];
      return allReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!vendorId,
  });

  const getAuthorLabel = (review: any) => {
    // If it's a real review, use the provided author_label
    if (review.type === 'real') {
      return review.author_label;
    }
    
    // For preview reviews, generate the label from session data
    if (review.anonymous || !review.session?.name) {
      return "Neighbor";
    }
    
    const formattedName = formatNameWithLastInitial(review.session.name.trim());
    const street = review.session.street_name;
    
    if (street?.trim()) {
      const cleanStreet = capitalizeStreetName(extractStreetName(street.trim()));
      return `${formattedName} on ${cleanStreet}`;
    }
    
    return formattedName;
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
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