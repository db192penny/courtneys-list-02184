-- Update badge levels to make Contributor require 5 points (joining bonus)
UPDATE public.badge_levels 
SET min_points = 5 
WHERE name = 'Contributor' AND min_points = 0;

-- Add point reward entry for joining the site
INSERT INTO public.point_rewards (activity, points, description)
VALUES ('join_site', 5, 'Welcome bonus for joining Courtney''s List')
ON CONFLICT (activity) DO UPDATE SET
  points = EXCLUDED.points,
  description = EXCLUDED.description;

-- Update existing point reward descriptions to be more user-friendly
UPDATE public.point_rewards 
SET description = 'Points earned for rating a vendor'
WHERE activity = 'review_submission';

UPDATE public.point_rewards 
SET description = 'Points earned for submitting a new vendor'
WHERE activity = 'vendor_submission';

UPDATE public.point_rewards 
SET description = 'Points earned for sharing cost information'
WHERE activity = 'cost_submission';

-- Add invite_neighbor activity if it doesn't exist
INSERT INTO public.point_rewards (activity, points, description)
VALUES ('invite_neighbor', 5, 'Points earned for inviting a neighbor')
ON CONFLICT (activity) DO NOTHING;

-- Backfill all existing users with "Joined Courtney's List" entry
INSERT INTO public.user_point_history (
  user_id, 
  activity_type, 
  points_earned, 
  description,
  created_at
)
SELECT 
  u.id,
  'join_site',
  5,
  'Joined Courtney''s List',
  u.created_at
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_point_history h 
  WHERE h.user_id = u.id AND h.activity_type = 'join_site'
);

-- Update all users' points to include the join bonus
UPDATE public.users 
SET points = COALESCE(points, 0) + 5
WHERE id IN (
  SELECT u.id 
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_point_history h 
    WHERE h.user_id = u.id AND h.activity_type = 'join_site'
  )
);

-- Create function to automatically award join points to new users
CREATE OR REPLACE FUNCTION public.award_join_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Award 5 points for joining the site
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 5
  WHERE id = NEW.id;
  
  -- Log to point history
  INSERT INTO public.user_point_history (
    user_id, 
    activity_type, 
    points_earned, 
    description
  ) VALUES (
    NEW.id,
    'join_site',
    5,
    'Joined Courtney''s List'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to award points when new users join
DROP TRIGGER IF EXISTS trg_award_join_points ON public.users;
CREATE TRIGGER trg_award_join_points
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.award_join_points();