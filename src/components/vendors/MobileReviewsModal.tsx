import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";
import { capitalizeStreetName } from "@/utils/address";

interface MobileReviewsModalProps {
  vendorId: string;
}

export function MobileReviewsModal({ vendorId }: MobileReviewsModalProps) {
  const { data: profile } = useUserProfile();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isVerified = !!profile?.isVerified;
  
  const [reviewClicks, setReviewClicks] = useState(0);
  const MAX_CLICKS = 3;
  
  useEffect(() => {
    if (!isAuthenticated) {
      const clicks = parseInt(localStorage.getItem('review_clicks') || '0');
      setReviewClicks(clicks);
    }
  }, [isAuthenticated]);
  
  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <p className="text-sm font-medium text-yellow-700">
          🔒 Sign up to see neighbor reviews
        </p>
      </div>
    );
  }
  
  const { data: rawData, isLoading, error } = useQuery<{ 
    id: string; 
    rating: number; 
    comments: string | null; 
    author_label: string; 
    created_at: string | null;
    anonymous: boolean;
  }[]>({
    queryKey: ["mobile-reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { 
        _vendor_id: vendorId 
      });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!vendorId,
  });
  
  // Format the author labels using frontend utilities
  const data = rawData?.map(review => {
    let name = 'Neighbor';
    let street = '';
    
    // Parse the name|street format from database
    if (review.author_label && review.author_label.includes('|')) {
      const parts = review.author_label.split('|');
      name = parts[0] || 'Neighbor';
      street = parts[1] || '';
    }
    
    let displayLabel;
    if (review.anonymous) {
      displayLabel = street ? `Neighbor on ${capitalizeStreetName(street)}` : 'Neighbor';
    } else {
      const formattedName = formatNameWithLastInitial(name);
      displayLabel = street ? `${formattedName} on ${capitalizeStreetName(street)}` : formattedName;
    }
    
    return {
      ...review,
      author_label: displayLabel
    };
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
        Sign up to be the first to review!
      </div>
    );
  }
  
  return (
    <div className="max-h-96 overflow-y-auto space-y-3 p-4">
      {data.map((r) => (
        <div key={r.id} className="border rounded-md p-3">
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
            <p className="text-sm text-muted-foreground">{r.comments}</p>
          )}
        </div>
      ))}
      
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