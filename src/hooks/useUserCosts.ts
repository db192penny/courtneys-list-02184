import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserCosts() {
  return useQuery({
    queryKey: ["user-costs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[useUserCosts] No user found");
        return new Map<string, boolean>();
      }

      console.log("[useUserCosts] Fetching for user:", user.id);
      const { data, error } = await supabase
        .from("costs")
        .select("vendor_id")
        .eq("created_by", user.id)
        .is("deleted_at", null);

      if (error) {
        console.error("[useUserCosts] Error:", error);
        throw error;
      }
      
      console.log("[useUserCosts] Raw data:", data);
      const costsMap = new Map(
        data?.map(item => [item.vendor_id, true]) || []
      );
      console.log("[useUserCosts] Costs Map:", Array.from(costsMap.entries()));
      
      return costsMap;
    },
    enabled: true,
  });
}