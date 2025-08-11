import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsHoaAdmin() {
  return useQuery<boolean>({
    queryKey: ["isHoaAdmin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_user_hoa_admin");
      if (error) {
        console.warn("[useIsHoaAdmin] error:", error);
        return false;
      }
      return !!data;
    },
  });
}

export default useIsHoaAdmin;
