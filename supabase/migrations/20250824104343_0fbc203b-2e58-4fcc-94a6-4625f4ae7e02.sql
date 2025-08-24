-- Create get_community_leaderboard function that excludes admins
CREATE OR REPLACE FUNCTION public.get_community_leaderboard(_community_name text, _limit integer DEFAULT 5)
RETURNS TABLE(name text, points integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    u.name,
    u.points::integer
  FROM public.users u
  JOIN public.household_hoa h ON h.normalized_address = public.normalize_address(u.address)
  WHERE LOWER(h.hoa_name) = LOWER(_community_name)
    AND u.is_verified = true
    AND u.points > 0
    -- Exclude admins from leaderboard
    AND NOT public.has_role(u.id, 'admin'::public.app_role)
  ORDER BY u.points DESC, u.created_at ASC
  LIMIT _limit;
$$;