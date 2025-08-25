
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  isVerified: boolean;
  submissionsCount: number;
  points: number;
  isAuthenticated: boolean;
};

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      console.log("[useUserProfile] fetching user profile");
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      
      // Session-first approach: if we have a user, they're authenticated
      if (!user) {
        return { isVerified: false, submissionsCount: 0, points: 0, isAuthenticated: false };
      }

      const { data, error } = await supabase
        .from("users")
        .select("is_verified, submissions_count, points")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[useUserProfile] profile load error:", error);
        // Even if profile query fails, user is still authenticated if they have a session
        return {
          isVerified: false,
          submissionsCount: 0,
          points: 0,
          isAuthenticated: true, // Session exists, so user is authenticated
        };
      }
      
      return {
        isVerified: !!data?.is_verified,
        submissionsCount: data?.submissions_count ?? 0,
        points: data?.points ?? 0,
        isAuthenticated: true, // Session exists, so user is authenticated
      };
    },
  });
}
