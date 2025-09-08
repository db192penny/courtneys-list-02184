import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface MobileReviewsModalProps {
  vendorId: string;
}

export function MobileReviewsModal({ vendorId }: MobileReviewsModalProps) {
  const { data: profile } = useUserProfile();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isVerified = !!profile?.isVerified;
  
  // Track clicks for non-authenticated users
  const [reviewClicks, setReviewClicks] = useState(0);
  const MAX_CLICKS = 3;
  
  useEffect(() => {
    if (!isAuthenticated) {
      const clicks = parseInt(localStorage.getItem('review_clicks') || '0');
      setReviewClicks(clicks);
    }
  }, [isAuthenticated]);
  
  const { data, isLoading, error } = useQuery<{ 
    id: string; 
    rating: number; 
    comments: string | null; 
    author_label: string; 
    created_at: string | null; 
  }[]>({
    queryKey: ["mobile-reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { 
        _vendor_id: vendorId 
      });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!vendorId && !!isAuthenticated,
  });
  
  const handleReviewInteraction = () => {
    if (!isAuthenticated) {
      const newClicks = reviewClicks + 1;
      setReviewClicks(newClicks);
      localStorage.setItem('review_clicks', newClicks.toString());
      
      if (newClicks >= MAX_CLICKS) {
        navigate(`/auth?community=Boca%20Bridges&vendor=${vendorId}`);
      }
    }
  };
  
  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading reviews…</div>;
  }
  
  if (error) {
    return <div className="text-sm text-muted-foreground p-4">Unable to load reviews.</div>;
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No reviews yet.
        {!isVerified && (
          <p className="mt-2 text-xs">Sign up to be the first to review!</p>
        )}
      </div>
    );
  }
  
  // Show preview banner for non-authenticated users
  const showPreviewBanner = !isAuthenticated && reviewClicks < MAX_CLICKS;
  
  return (
    <div className="max-h-96 overflow-y-auto space-y-3 p-4">
      {showPreviewBanner && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          Preview Mode: {MAX_CLICKS - reviewClicks} views remaining before signup required
        </div>
      )}
      
      {data.map((r, index) => {
        // For non-authenticated users, limit visible reviews and track interactions
        if (!isAuthenticated && index >= 2) {
          return (
            <div key={r.id} className="p-3 text-center text-sm text-muted-foreground border rounded-md">
              <button 
                onClick={handleReviewInteraction}
                className="text-blue-600 hover:underline"
              >
                {reviewClicks < MAX_CLICKS 
                  ? `View ${data.length - 2} more reviews` 
                  : 'Sign up to see more reviews'}
              </button>
            </div>
          );
        }
        
        return (
          <div 
            key={r.id} 
            className="border rounded-md p-3"
            onClick={!isAuthenticated ? handleReviewInteraction : undefined}
          >
            <div className="text-xs text-foreground flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{r.rating}/5</span>
                </div>
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  {r.author_label}
                </Badge>
              </div>
              {r.created_at && (
                <div className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
            {r.comments && (
              <p className="text-sm text-muted-foreground">
                {!isAuthenticated && r.comments.length > 150 
                  ? r.comments.substring(0, 150) + '...' 
                  : r.comments}
              </p>
            )}
          </div>
        );
      })}
      
      {!isVerified && data.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
          <p className="text-sm text-blue-700">
            Want to add your review? Sign up to contribute!
          </p>
        </div>
      )}
    </div>
  );
}