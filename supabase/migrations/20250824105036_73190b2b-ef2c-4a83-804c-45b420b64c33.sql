-- Update get_community_leaderboard function to exclude admins and users who live with admins
CREATE OR REPLACE FUNCTION public.get_community_leaderboard(_community_name text, _limit integer DEFAULT 5)
RETURNS TABLE(name text, points integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH admin_addresses AS (
    SELECT DISTINCT public.normalize_address(u.address) as normalized_address
    FROM public.users u
    WHERE public.has_role(u.id, 'admin'::public.app_role)
  )
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
    -- Exclude users who live at the same address as any admin
    AND public.normalize_address(u.address) NOT IN (SELECT normalized_address FROM admin_addresses)
  ORDER BY u.points DESC, u.created_at ASC
  LIMIT _limit;
$$;