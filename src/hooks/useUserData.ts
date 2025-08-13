import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserData = {
  name?: string;
  streetName?: string;
  isAuthenticated: boolean;
};

export function useUserData() {
  return useQuery<UserData>({
    queryKey: ["userData"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        return { isAuthenticated: false };
      }
      const { data, error } = await supabase
        .from("users")
        .select("name, street_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[useUserData] user data load error:", error);
      }
      return {
        name: data?.name || undefined,
        streetName: data?.street_name || undefined,
        isAuthenticated: true,
      };
    },
  });
}