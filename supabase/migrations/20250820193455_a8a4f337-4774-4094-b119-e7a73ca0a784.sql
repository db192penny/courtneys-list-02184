-- Create signup points trigger function
CREATE OR REPLACE FUNCTION public.trg_signup_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Award 5 points for joining the site
  NEW.points := COALESCE(NEW.points, 0) + 5;
  
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
    'Welcome bonus for joining the site'
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger on users table for signup points
CREATE TRIGGER trigger_signup_points
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_signup_points();

-- Fix Tim's missing points manually
UPDATE public.users 
SET points = COALESCE(points, 0) + 5
WHERE email = 'timfrailly@yahoo.com';

-- Add Tim's point history entry
INSERT INTO public.user_point_history (
  user_id, 
  activity_type, 
  points_earned, 
  description
) 
SELECT 
  id,
  'join_site',
  5,
  'Retroactive welcome bonus for joining the site'
FROM public.users 
WHERE email = 'timfrailly@yahoo.com';