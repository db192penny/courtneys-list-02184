import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AddressChangeRequest {
  id: string;
  current_address: string;
  requested_address: string;
  requested_formatted_address?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  rejection_reason?: string;
  admin_notes?: string;
}

export function useAddressChangeRequests() {
  return useQuery<AddressChangeRequest[]>({
    queryKey: ["user-address-change-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("address_change_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching address change requests:", error);
        throw error;
      }

      return data?.map(req => ({
        ...req,
        status: req.status as 'pending' | 'approved' | 'rejected' | 'cancelled'
      })) || [];
    },
  });
}

export function usePendingAddressChangeRequest() {
  const { data: requests } = useAddressChangeRequests();
  return requests?.find(req => req.status === 'pending');
}