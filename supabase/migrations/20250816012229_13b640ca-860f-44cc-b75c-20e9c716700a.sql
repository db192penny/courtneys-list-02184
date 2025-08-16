-- Fix Dave's points and audit the entire point system
-- First, fix Dave's specific issue
UPDATE public.users 
SET points = 5 
WHERE email = 'davebirnbaum@gmail.com' AND points = 0;

-- Create a comprehensive audit function to check all users for point discrepancies
CREATE OR REPLACE FUNCTION public.audit_user_points()
RETURNS TABLE(
  user_email text,
  current_points integer,
  calculated_points integer,
  history_points integer,
  discrepancy boolean,
  vendor_count integer,
  review_count integer,
  cost_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_activities AS (
    SELECT 
      u.id,
      u.email,
      u.points as current_points,
      -- Calculate points from actual activities (5 points each)
      (COALESCE((SELECT COUNT(*) FROM public.vendors WHERE created_by = u.id), 0) * 5) +
      (COALESCE((SELECT COUNT(*) FROM public.reviews WHERE user_id = u.id), 0) * 5) +
      (COALESCE((SELECT COUNT(*) FROM public.costs WHERE created_by = u.id), 0) * 5) +
      5 as calculated_points, -- +5 for joining
      -- Sum from point history
      COALESCE((SELECT SUM(points_earned) FROM public.user_point_history WHERE user_id = u.id), 0) as history_points,
      -- Activity counts
      COALESCE((SELECT COUNT(*) FROM public.vendors WHERE created_by = u.id), 0) as vendor_count,
      COALESCE((SELECT COUNT(*) FROM public.reviews WHERE user_id = u.id), 0) as review_count,
      COALESCE((SELECT COUNT(*) FROM public.costs WHERE created_by = u.id), 0) as cost_count
    FROM public.users u
  )
  SELECT 
    ua.email,
    ua.current_points::integer,
    ua.calculated_points::integer,
    ua.history_points::integer,
    (ua.current_points != ua.calculated_points OR ua.current_points != ua.history_points) as discrepancy,
    ua.vendor_count::integer,
    ua.review_count::integer,
    ua.cost_count::integer
  FROM user_activities ua
  ORDER BY ua.email;
END;
$$;

-- Fix all point discrepancies automatically
CREATE OR REPLACE FUNCTION public.fix_all_point_discrepancies()
RETURNS TABLE(
  fixed_user_email text,
  old_points integer,
  new_points integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record record;
  calculated_points integer;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.points,
           -- Calculate correct points
           (COALESCE((SELECT COUNT(*) FROM public.vendors WHERE created_by = u.id), 0) * 5) +
           (COALESCE((SELECT COUNT(*) FROM public.reviews WHERE user_id = u.id), 0) * 5) +
           (COALESCE((SELECT COUNT(*) FROM public.costs WHERE created_by = u.id), 0) * 5) +
           5 as correct_points -- +5 for joining
    FROM public.users u
  LOOP
    calculated_points := user_record.correct_points;
    
    -- Only update if there's a discrepancy
    IF user_record.points != calculated_points THEN
      UPDATE public.users 
      SET points = calculated_points 
      WHERE id = user_record.id;
      
      -- Log the correction
      INSERT INTO public.user_point_history (
        user_id,
        activity_type,
        points_earned,
        description
      ) VALUES (
        user_record.id,
        'system_correction',
        calculated_points - user_record.points,
        'System audit correction: Fixed points from ' || user_record.points || ' to ' || calculated_points
      );
      
      -- Return the fix details
      fixed_user_email := user_record.email;
      old_points := user_record.points;
      new_points := calculated_points;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;