import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PointReward = {
  id: string;
  activity: string;
  points: number;
  description: string | null;
};

export function usePointRewards() {
  return useQuery<PointReward[]>({
    queryKey: ["pointRewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_rewards")
        .select("id, activity, points, description")
        .order("points", { ascending: false });

      if (error) {
        console.warn("[usePointRewards] error:", error);
        return [];
      }
      return data || [];
    },
  });
}