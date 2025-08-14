import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserHomeVendors() {
  return useQuery({
    queryKey: ["user-home-vendors"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Set<string>();

      const { data, error } = await supabase
        .from("home_vendors")
        .select("vendor_id")
        .eq("user_id", user.id);

      if (error) throw error;
      
      return new Set(data?.map(item => item.vendor_id) || []);
    },
    enabled: true,
  });
}