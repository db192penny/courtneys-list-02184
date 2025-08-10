
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  isVerified: boolean;
  submissionsCount: number;
  isAuthenticated: boolean;
};

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      console.log("[useUserProfile] fetching user profile");
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        return { isVerified: false, submissionsCount: 0, isAuthenticated: false };
      }
      const { data, error } = await supabase
        .from("users")
        .select("is_verified, submissions_count")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[useUserProfile] profile load error:", error);
      }
      return {
        isVerified: !!data?.is_verified,
        submissionsCount: data?.submissions_count ?? 0,
        isAuthenticated: true,
      };
    },
  });
}
