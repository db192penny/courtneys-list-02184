import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserReviews() {
  return useQuery({
    queryKey: ["user-reviews"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[useUserReviews] No user found");
        return new Map<string, { rating: number; id: string }>();
      }

      console.log("[useUserReviews] Fetching for user:", user.id);
      const { data, error } = await supabase
        .from("reviews")
        .select("id, vendor_id, rating")
        .eq("user_id", user.id);

      if (error) {
        console.error("[useUserReviews] Error:", error);
        throw error;
      }
      
      console.log("[useUserReviews] Raw data:", data);
      const reviewsMap = new Map(
        data?.map(item => [
          item.vendor_id, 
          { rating: item.rating, id: item.id }
        ]) || []
      );
      console.log("[useUserReviews] Reviews Map:", Array.from(reviewsMap.entries()));
      
      return reviewsMap;
    },
    enabled: true,
  });
}