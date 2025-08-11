import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) {
        console.warn("[useIsAdmin] error:", error);
        return false;
      }
      return !!data;
    },
  });
}

export default useIsAdmin;
