import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

// Lightweight hover card that shows community review texts for a vendor
export default function ReviewsHover({ vendorId, children }: { vendorId: string; children: ReactNode }) {
  const { data: profile } = useUserProfile();
  const isVerified = !!profile?.isVerified;

  const { data, isLoading, error } = useQuery<{ id: string; rating: number; comments: string | null; author_label: string; created_at: string | null; }[]>({
    queryKey: ["reviews-hover", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { _vendor_id: vendorId });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: isVerified && !!vendorId,
  });

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="cursor-help">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        {!isVerified && (
          <div className="text-sm text-muted-foreground">
            Reviews are shared just within our neighborhood circle. Sign up to view them.
          </div>
        )}
        {isVerified && isLoading && (
          <div className="text-sm text-muted-foreground">Loading reviews…</div>
        )}
        {isVerified && error && (
          <div className="text-sm text-muted-foreground">Unable to load reviews.</div>
        )}
        {isVerified && data && data.length === 0 && (
          <div className="text-sm text-muted-foreground">No reviews yet.</div>
        )}
        {isVerified && data && data.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-3">
            {data.map((r) => (
              <div key={r.id} className="border rounded-md p-2">
                <div className="text-xs text-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{r.rating}/5</span>
                    </div>
                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                      by {r.author_label}
                    </Badge>
                  </div>
                  {r.created_at && (
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {r.comments && (
                  <p className="text-sm text-muted-foreground mt-1">{r.comments}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
