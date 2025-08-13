import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PointHistoryEntry = {
  id: string;
  activity_type: string;
  points_earned: number;
  description: string;
  created_at: string;
};

export function usePointHistory() {
  return useQuery<PointHistoryEntry[]>({
    queryKey: ["pointHistory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_point_history")
        .select("id, activity_type, points_earned, description, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("[usePointHistory] error:", error);
        return [];
      }
      return data || [];
    },
  });
}

export function usePointBreakdown() {
  return useQuery<{ activity_type: string; total_points: number; count: number }[]>({
    queryKey: ["pointBreakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_point_history")
        .select("activity_type, points_earned")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[usePointBreakdown] error:", error);
        return [];
      }

      // Group by activity type
      const breakdown = (data || []).reduce((acc, entry) => {
        const existing = acc.find(item => item.activity_type === entry.activity_type);
        if (existing) {
          existing.total_points += entry.points_earned;
          existing.count += 1;
        } else {
          acc.push({
            activity_type: entry.activity_type,
            total_points: entry.points_earned,
            count: 1
          });
        }
        return acc;
      }, [] as { activity_type: string; total_points: number; count: number }[]);

      return breakdown.sort((a, b) => b.total_points - a.total_points);
    },
  });
}