-- Create function to get community leaderboard data
CREATE OR REPLACE FUNCTION public.get_community_leaderboard(_community_name text, _limit integer DEFAULT 5)
RETURNS TABLE(
  name text,
  points integer,
  street_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    u.name,
    u.points,
    u.street_name
  FROM public.users u
  JOIN public.household_hoa hh ON hh.normalized_address = public.normalize_address(u.address)
  WHERE u.is_verified = true
    AND u.name IS NOT NULL
    AND u.points > 0
    AND LOWER(hh.hoa_name) = LOWER(_community_name)
    AND u.email NOT IN ('davebirnbaum@gmail.com', 'clkramer@gmail.com')
  ORDER BY u.points DESC, u.created_at ASC
  LIMIT _limit;
$function$;