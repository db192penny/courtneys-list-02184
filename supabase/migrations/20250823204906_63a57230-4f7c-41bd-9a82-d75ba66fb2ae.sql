-- Drop and recreate get_community_leaderboard function to remove street_name dependency
DROP FUNCTION IF EXISTS public.get_community_leaderboard(text, integer);

CREATE OR REPLACE FUNCTION public.get_community_leaderboard(_community_name text, _limit integer DEFAULT 5)
RETURNS TABLE(name text, points integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.name,
    u.points::integer
  FROM public.users u
  JOIN public.household_hoa h ON h.normalized_address = public.normalize_address(u.address)
  WHERE LOWER(h.hoa_name) = LOWER(_community_name)
    AND u.is_verified = true
    AND u.points > 0
    AND u.email NOT IN ('davebirnbaum@gmail.com', 'clkramer@gmail.com') -- Exclude David and Courtney Birnbaum
  ORDER BY u.points DESC, u.created_at ASC
  LIMIT _limit;
END;
$$;