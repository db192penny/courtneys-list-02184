import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { RatingStars } from "@/components/ui/rating-stars";

export function MobileReviewsModal({ open, onOpenChange, vendor, onRate }) {
  const { data: profile } = useUserProfile();
  const isVerified = !!profile?.isVerified;
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["mobile-reviews", vendor?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { 
        _vendor_id: vendor?.id 
      });
      if (error) throw error;
      
      return data || [];
    },
    enabled: isVerified && !!vendor?.id,
  });

  if (!isVerified) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Reviews are shared just within our neighborhood circle. Sign up to view them.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-md p-4 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
              <div className="w-16 h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-muted-foreground p-4">Unable to load reviews.</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No reviews yet.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 max-h-96 overflow-y-auto space-y-4 p-4">
        {data.map((r) => (
          <div key={r.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
            {/* Header with just date */}
            {r.created_at && (
              <div className="flex justify-end mb-3">
                <div className="text-xs text-blue-600">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            )}
            
            {/* Comment with elegant styling to match preview */}
            {r.comments && r.comments.trim() ? (
              <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                <p className="text-base text-blue-800 font-medium leading-snug mb-3 italic">
                  "{r.comments}"
                </p>
                {/* Right-aligned attribution with rating below */}
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-700 mb-1">
                      — {r.author_label}
                    </p>
                    <RatingStars rating={r.rating} size="sm" showValue className="justify-end" />
                  </div>
                </div>
              </div>
            ) : (
              /* Rating-only display when no comment */
              <div className="bg-white/60 rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-sm text-blue-600 mb-2">
                  {r.author_label}
                </div>
                <RatingStars rating={r.rating} size="md" className="justify-center" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}