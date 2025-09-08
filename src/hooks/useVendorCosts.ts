import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

type CostData = {
  id: string;
  amount: number;
  unit: string | null;
  period: string | null;
  cost_kind: string | null;
  notes: string | null;
  created_at: string;
  author_label: string;
};

export function useVendorCosts(vendorId: string) {
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

      return (data || []) as CostData[];
    },
    enabled: isVerified && !!vendorId,
  });
}