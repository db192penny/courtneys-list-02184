import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MobileReviewsModalProps {
  vendorId: string;
}

export function MobileReviewsModal({ vendorId }: MobileReviewsModalProps) {
  const { isAuthenticated } = useAuth();
  
  // Early return for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <p className="text-sm font-medium text-yellow-700">
          🔒 Sign up to see neighbor reviews
        </p>
      </div>
    );
  }
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["mobile-reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { 
        _vendor_id: vendorId 
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorId && isAuthenticated, // Re-add authentication check
  });
  
  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading reviews…</div>;
  }
  
  if (error) {
    return <div className="text-sm text-muted-foreground p-4">Unable to load reviews.</div>;
  }
  
  const data = rawData || [];
  
  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No reviews yet. Be the first to review!
      </div>
    );
  }
  
  return (
    <div className="max-h-96 overflow-y-auto space-y-3 p-4">
      {data.map((r: any) => {
        const authorLabel = String(r.author_label || 'Neighbor');
        const rating = Number(r.rating || 0);
        const comments = String(r.comments || '');
        
        return (
          <div key={r.id} className="border rounded-md p-3">
            <div className="text-xs text-foreground flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{rating}/5</span>
                </div>
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  {authorLabel}
                </Badge>
              </div>
              {r.created_at && (
                <div className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
            {comments && (
              <p className="text-sm text-muted-foreground">{comments}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}