iimport { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface MobileReviewsModalProps {
  vendorId: string;
}

export function MobileReviewsModal({ vendorId }: MobileReviewsModalProps) {
  const { data: profile } = useUserProfile();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isVerified = !!profile?.isVerified;
  
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
    anonymous?: boolean;
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
  
  // SAFE formatting function
  const formatAuthorLabel = (review: any): string => {
    try {
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
      
      return authorStr;
    } catch (err) {
      console.error('Error formatting author label:', err);
      return 'Neighbor';
    }
  };
  
  const data = rawData?.map(review => ({
    ...review,
    author_label: formatAuthorLabel(review)
  })) || [];
  
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
            <p className="text-sm text-muted-foreground">{String(r.comments)}</p>
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