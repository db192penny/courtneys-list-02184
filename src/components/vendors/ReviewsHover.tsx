import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";
import { capitalizeStreetName } from "@/utils/address";

// Lightweight hover card that shows community review texts for a vendor
export default function ReviewsHover({ vendorId, children }: { vendorId: string; children: ReactNode }) {
  const { data: profile } = useUserProfile();
  const { isAuthenticated } = useAuth();
  const isVerified = !!profile?.isVerified;
  
  if (!isAuthenticated) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <span className="cursor-help">{children}</span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="text-sm text-muted-foreground">
            🔒 Sign up to see neighbor reviews
          </div>
        </HoverCardContent>
      </HoverCard>
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
    queryKey: ["reviews-hover", vendorId],
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
    const [name, street] = review.author_label.split('|');
    
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

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading reviews…</div>
        )}
        {error && (
          <div className="text-sm text-muted-foreground">Unable to load reviews.</div>
        )}
        {data && data.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Sign up to be the first to review!
          </div>
        )}
        {data && data.length > 0 && (
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
                  <p className="text-sm text-muted-foreground mt-1">{r.comments}</p>
                )}
              </div>
            ))}
            {!isVerified && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md text-center">
                <p className="text-xs text-blue-700">
                  Want to add your review? Sign up to contribute!
                </p>
              </div>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}