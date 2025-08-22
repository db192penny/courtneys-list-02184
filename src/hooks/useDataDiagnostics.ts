
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDataDiagnostics() {
  return useQuery({
    queryKey: ["data-diagnostics"],
    queryFn: async () => {
      console.log("[useDataDiagnostics] Starting data diagnostics...");
      
      // Check home_vendors constraints
      const { data: constraints, error: constraintsError } = await supabase.rpc('admin_check_missing_hoa_mappings');
      if (constraintsError) {
        console.warn("[useDataDiagnostics] Constraints check failed:", constraintsError);
      }
      
      // Check home_vendors vs reviews counts
      const { data: homeVendorsCount } = await supabase
        .from("home_vendors")
        .select("user_id", { count: "exact", head: true });
      
      const { data: reviewsCount } = await supabase
        .from("reviews")
        .select("user_id", { count: "exact", head: true });
      
      // Check for duplicate entries in home_vendors that might be causing constraint violations
      const { data: duplicateCheck } = await supabase
        .from("home_vendors")
        .select("user_id, vendor_id")
        .order("created_at", { ascending: false });
      
      // Group by user_id + vendor_id to find duplicates
      const duplicates = duplicateCheck?.reduce((acc: any, curr: any) => {
        const key = `${curr.user_id}-${curr.vendor_id}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(curr);
        return acc;
      }, {});
      
      const duplicateEntries = Object.entries(duplicates || {}).filter(([_, entries]: [string, any]) => entries.length > 1);
      
      console.log("[useDataDiagnostics] Results:", {
        homeVendorsCount: homeVendorsCount,
        reviewsCount: reviewsCount,
        duplicateEntries: duplicateEntries.length,
        duplicateDetails: duplicateEntries
      });
      
      return {
        homeVendorsCount: homeVendorsCount || 0,
        reviewsCount: reviewsCount || 0,
        duplicateEntries: duplicateEntries.length,
        duplicateDetails: duplicateEntries
      };
    },
    enabled: true,
  });
}
