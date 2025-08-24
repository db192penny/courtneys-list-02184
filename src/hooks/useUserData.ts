import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserData = {
  name?: string;
  streetName?: string;
  address?: string;
  communityName?: string;
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
        .select("name, street_name, address")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[useUserData] user data load error:", error);
      }

      // Fetch community name
      let communityName: string | undefined;
      try {
        const { data: hoaData } = await supabase.rpc("get_my_hoa");
        communityName = hoaData?.[0]?.hoa_name || undefined;
      } catch (hoaError) {
        console.warn("[useUserData] HOA data load error:", hoaError);
      }

      return {
        name: data?.name || undefined,
        streetName: data?.street_name || undefined,
        address: data?.address || undefined,
        communityName,
        isAuthenticated: true,
      };
    },
  });
}