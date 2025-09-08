import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { formatAuthorLabel } from "@/utils/formatAuthorLabel";

interface MobileReviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: any;
  onRate?: () => void;
}

export function MobileReviewsModal({ open, onOpenChange, vendor, onRate }: MobileReviewsModalProps) {
  const { data: profile } = useUserProfile();
  const isVerified = !!profile?.isVerified;
  
  const { data, isLoading, error } = useQuery<{ 
    id: string; 
    rating: number; 
    comments: string | null; 
    author_label: string; 
    created_at: string | null; 
  }[]>({
    queryKey: ["mobile-reviews", vendor?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { 
        _vendor_id: vendor?.id 
      });
      if (error) throw error;
      
      // Format the author labels
      return (data || []).map((item: any) => ({
        ...item,
        author_label: formatAuthorLabel(item?.author_label)
      }));
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
                <div className="text-[10px] text-mute