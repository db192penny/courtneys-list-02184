import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
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
        <span className="cursor-help underline-offset-2 hover:underline">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        {!isVerified && (
          <div className="text-sm text-muted-foreground">
            Reviews are available after verification.
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
                <div className="text-xs text-foreground">
                  <span className="font-medium">{r.rating}/5</span>
                  <span className="ml-2 text-muted-foreground">by {r.author_label}</span>
                </div>
                {r.comments && (
                  <p className="text-sm text-muted-foreground mt-1">{r.comments}</p>
                )}
                {r.created_at && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
