import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BadgeLevel = {
  id: string;
  name: string;
  min_points: number;
  color: string;
  icon: string;
};

export function useBadgeLevels() {
  return useQuery<BadgeLevel[]>({
    queryKey: ["badge-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_levels")
        .select("*")
        .order("min_points", { ascending: true });

      if (error) {
        console.warn("[useBadgeLevels] error:", error);
        return [];
      }
      return data || [];
    },
  });
}

export function getUserCurrentBadge(points: number, badgeLevels: BadgeLevel[]): BadgeLevel | null {
  if (!badgeLevels.length) return null;
  
  // Find the highest badge level the user qualifies for
  const qualifiedBadges = badgeLevels.filter(badge => points >= badge.min_points);
  return qualifiedBadges.length > 0 ? qualifiedBadges[qualifiedBadges.length - 1] : badgeLevels[0];
}

export function getUserNextBadge(points: number, badgeLevels: BadgeLevel[]): BadgeLevel | null {
  if (!badgeLevels.length) return null;
  
  // Find the next badge level the user hasn't reached yet
  return badgeLevels.find(badge => points < badge.min_points) || null;
}