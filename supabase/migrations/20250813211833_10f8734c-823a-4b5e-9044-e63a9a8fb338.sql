-- Create trigger function for vendor points
CREATE OR REPLACE FUNCTION public.trg_vendor_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 10 points for vendor submission
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 10
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$function$;

-- Create trigger function for review points
CREATE OR REPLACE FUNCTION public.trg_review_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 5 points for review submission
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 5
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger function for cost points
CREATE OR REPLACE FUNCTION public.trg_cost_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 5 points for cost submission
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 5
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$function$;

-- Create triggers on tables
CREATE TRIGGER trigger_vendor_points
  AFTER INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vendor_points();

CREATE TRIGGER trigger_review_points
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_review_points();

CREATE TRIGGER trigger_cost_points
  AFTER INSERT ON public.costs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cost_points();

-- Backfill existing points for all users
WITH point_calculations AS (
  SELECT 
    u.id,
    -- 10 points per vendor submission
    COALESCE((SELECT COUNT(*) * 10 FROM public.vendors v WHERE v.created_by = u.id), 0) +
    -- 5 points per review
    COALESCE((SELECT COUNT(*) * 5 FROM public.reviews r WHERE r.user_id = u.id), 0) +
    -- 5 points per cost entry
    COALESCE((SELECT COUNT(*) * 5 FROM public.costs c WHERE c.created_by = u.id), 0) as total_points
  FROM public.users u
)
UPDATE public.users 
SET points = pc.total_points
FROM point_calculations pc
WHERE users.id = pc.id AND pc.total_points > 0;