import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserHomeVendors() {
  return useQuery({
    queryKey: ["user-home-vendors"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[useUserHomeVendors] No user found");
        return new Set<string>();
      }

      console.log("[useUserHomeVendors] Fetching for user:", user.id);
      const { data, error } = await supabase
        .from("home_vendors")
        .select("vendor_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("[useUserHomeVendors] Error:", error);
        throw error;
      }
      
      console.log("[useUserHomeVendors] Raw data:", data);
      const vendorSet = new Set(data?.map(item => item.vendor_id) || []);
      console.log("[useUserHomeVendors] Vendor IDs Set:", Array.from(vendorSet));
      
      return vendorSet;
    },
    enabled: true,
  });
}