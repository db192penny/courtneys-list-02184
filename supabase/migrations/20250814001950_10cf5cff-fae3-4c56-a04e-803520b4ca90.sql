-- Update point history activity types to match the three ways to earn points
-- Change 'rate_vendor' to 'review_submission' for consistency
UPDATE public.user_point_history 
SET activity_type = 'review_submission' 
WHERE activity_type = 'rate_vendor';

-- Also update the trigger function to use consistent naming
CREATE OR REPLACE FUNCTION public.trg_rate_vendor_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only award points for the first review of this vendor by this user
  IF NOT EXISTS (
    SELECT 1 FROM public.user_point_history 
    WHERE user_id = NEW.user_id 
    AND activity_type = 'review_submission' 
    AND related_id = NEW.vendor_id
  ) THEN
    -- Award 5 points for rating a vendor (first time only)
    UPDATE public.users 
    SET points = COALESCE(points, 0) + 5
    WHERE id = NEW.user_id;
    
    -- Log to point history using vendor_id as related_id for uniqueness check
    INSERT INTO public.user_point_history (
      user_id, 
      activity_type, 
      points_earned, 
      description, 
      related_id
    ) VALUES (
      NEW.user_id,
      'review_submission',
      5,
      'Rated vendor with ' || NEW.rating || ' stars',
      NEW.vendor_id  -- Use vendor_id to track uniqueness per vendor
    );
  END IF;
  
  RETURN NEW;
END;
$function$;