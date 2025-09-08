import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ReviewSourceIcon } from "./ReviewSourceIcon";

interface MobileReviewsModalProps {
  vendorId: string;
  onRate?: () => void;
}

export function MobileReviewsModal({ vendorId, onRate }: MobileReviewsModalProps) {
  const { data: profile } = useUserProfile();
  const isVerified = !!profile?.isVerified;

  const { data, isLoading, error } = useQuery<{ id: string; rating: number; comments: string | null; author_label: string; created_at: string | null; }[]>({
    queryKey: ["mobile-reviews", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { _vendor_id: vendorId });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: isVerified && !!vendorId,
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
      <div className="flex-1 max-h-96 overflow-y-auto space-y-3 p-4">
        {data.map((r) => (
          <div key={r.id} className="border rounded-md p-4 mb-3">
            <div className="text-xs text-foreground flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{r.rating}/5</span>
                </div>
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 font-medium">
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
      </div>
      
      <div className="mt-4 pt-4 border-t flex gap-2">
        <Button 
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
          onClick={onRate}
        >
          Write Review
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => {}}
        >
          Close
        </Button>
      </div>
    </div>
  );
}