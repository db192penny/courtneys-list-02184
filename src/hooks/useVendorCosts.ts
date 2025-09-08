import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatAuthorLabel } from "@/utils/formatAuthorLabel";

export function useVendorCosts(vendorId) {
  const { data: profile } = useUserProfile();
  const isVerified = !!profile?.isVerified;

  return useQuery({
    queryKey: ["vendor-costs", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_costs", {
        _vendor_id: vendorId,
      });
      
      if (error) {
        console.error("Error fetching costs:", error);
        throw error;
      }

      // Format the author labels
      return (data || []).map((item) => ({
        ...item,
        author_label: formatAuthorLabel(item?.author_label)
      }));
    },
    enabled: isVerified && !!vendorId,
  });
}