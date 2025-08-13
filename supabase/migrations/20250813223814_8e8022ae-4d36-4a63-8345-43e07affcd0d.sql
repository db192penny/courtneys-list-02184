-- Update point rewards table with simplified point system
DELETE FROM public.point_rewards;

INSERT INTO public.point_rewards (activity, points, description) VALUES
('rate_vendor', 5, 'Rate a vendor (unique per vendor)'),
('vendor_submission', 5, 'Submit a new vendor'),
('invite_neighbor', 10, 'Invite a neighbor to join');

-- Drop existing triggers that award points
DROP TRIGGER IF EXISTS vendor_points_trigger ON public.vendors;
DROP TRIGGER IF EXISTS review_points_trigger ON public.reviews;
DROP TRIGGER IF EXISTS cost_points_trigger ON public.costs;

-- Create improved trigger functions that handle unique vendor ratings
CREATE OR REPLACE FUNCTION public.trg_vendor_submission_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Award 5 points for vendor submission
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 5
  WHERE id = NEW.created_by;
  
  -- Log to point history
  INSERT INTO public.user_point_history (
    user_id, 
    activity_type, 
    points_earned, 
    description, 
    related_id
  ) VALUES (
    NEW.created_by,
    'vendor_submission',
    5,
    'Submitted vendor: ' || NEW.name,
    NEW.id
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_rate_vendor_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only award points for the first review of this vendor by this user
  IF NOT EXISTS (
    SELECT 1 FROM public.user_point_history 
    WHERE user_id = NEW.user_id 
    AND activity_type = 'rate_vendor' 
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
      'rate_vendor',
      5,
      'Rated vendor with ' || NEW.rating || ' stars',
      NEW.vendor_id  -- Use vendor_id to track uniqueness per vendor
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create triggers with new functions
CREATE TRIGGER vendor_submission_points_trigger
  AFTER INSERT ON public.vendors
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)
  EXECUTE FUNCTION public.trg_vendor_submission_points();

CREATE TRIGGER rate_vendor_points_trigger
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.trg_rate_vendor_points();

-- Also handle updates to reviews (but don't award additional points)
CREATE OR REPLACE FUNCTION public.trg_rate_vendor_points_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Don't award additional points for updates, just return
  RETURN NEW;
END;
$function$;

CREATE TRIGGER rate_vendor_points_update_trigger
  AFTER UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rate_vendor_points_update();