-- Fix point calculation inconsistencies
-- Step 1: Create a comprehensive audit and fix function

CREATE OR REPLACE FUNCTION public.audit_and_fix_user_points()
RETURNS TABLE(
  user_id uuid,
  old_points integer,
  calculated_points integer,
  vendor_submissions integer,
  reviews integer,
  cost_submissions integer,
  points_fixed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record record;
  calc_vendor_points integer;
  calc_review_points integer;
  calc_cost_points integer;
  total_calculated_points integer;
  current_user_points integer;
BEGIN
  -- Loop through all users
  FOR user_record IN 
    SELECT u.id, u.points, u.name, u.email
    FROM public.users u
  LOOP
    -- Count actual activities for this user
    SELECT 
      COALESCE(COUNT(v.id), 0) * 5 as vendor_pts,
      COALESCE(COUNT(r.id), 0) * 5 as review_pts,
      COALESCE(COUNT(c.id), 0) * 5 as cost_pts
    INTO calc_vendor_points, calc_review_points, calc_cost_points
    FROM public.users u
    LEFT JOIN public.vendors v ON v.created_by = u.id
    LEFT JOIN public.reviews r ON r.user_id = u.id
    LEFT JOIN public.costs c ON c.created_by = u.id
    WHERE u.id = user_record.id;
    
    total_calculated_points := calc_vendor_points + calc_review_points + calc_cost_points;
    current_user_points := COALESCE(user_record.points, 0);
    
    -- Return audit info
    user_id := user_record.id;
    old_points := current_user_points;
    calculated_points := total_calculated_points;
    vendor_submissions := calc_vendor_points / 5;
    reviews := calc_review_points / 5;
    cost_submissions := calc_cost_points / 5;
    points_fixed := (current_user_points != total_calculated_points);
    
    -- Fix the points if they don't match
    IF current_user_points != total_calculated_points THEN
      UPDATE public.users 
      SET points = total_calculated_points 
      WHERE id = user_record.id;
      
      -- Log the correction in point history
      INSERT INTO public.user_point_history (
        user_id,
        activity_type,
        points_earned,
        description,
        related_id
      ) VALUES (
        user_record.id,
        'system_correction',
        total_calculated_points - current_user_points,
        'System correction: Adjusted points from ' || current_user_points || ' to ' || total_calculated_points,
        null
      );
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- Step 2: Backfill missing point history entries for existing activities

-- Backfill vendor submission history
INSERT INTO public.user_point_history (
  user_id,
  activity_type,
  points_earned,
  description,
  related_id,
  created_at
)
SELECT DISTINCT
  v.created_by,
  'vendor_submission',
  5,
  'Backfilled: Submitted vendor: ' || v.name,
  v.id,
  v.created_at
FROM public.vendors v
WHERE v.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_point_history h
    WHERE h.user_id = v.created_by
      AND h.activity_type = 'vendor_submission'
      AND h.related_id = v.id
  );

-- Backfill review submission history
INSERT INTO public.user_point_history (
  user_id,
  activity_type,
  points_earned,
  description,
  related_id,
  created_at
)
SELECT DISTINCT
  r.user_id,
  'review_submission',
  5,
  'Backfilled: Reviewed vendor with ' || r.rating || ' stars',
  r.vendor_id,
  r.created_at
FROM public.reviews r
WHERE r.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_point_history h
    WHERE h.user_id = r.user_id
      AND h.activity_type = 'review_submission'
      AND h.related_id = r.vendor_id
  );

-- Backfill cost submission history
INSERT INTO public.user_point_history (
  user_id,
  activity_type,
  points_earned,
  description,
  related_id,
  created_at
)
SELECT DISTINCT
  c.created_by,
  'cost_submission',
  5,
  'Backfilled: Shared cost information: $' || c.amount,
  c.id,
  c.created_at
FROM public.costs c
WHERE c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_point_history h
    WHERE h.user_id = c.created_by
      AND h.activity_type = 'cost_submission'
      AND h.related_id = c.id
  );

-- Step 3: Run the audit and fix function to correct all point totals
SELECT * FROM public.audit_and_fix_user_points();

-- Step 4: Add a constraint to ensure point history consistency (validation)
CREATE OR REPLACE FUNCTION public.validate_user_points_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculated_points integer;
  history_points integer;
BEGIN
  -- Calculate points from actual activities
  SELECT 
    (COALESCE((SELECT COUNT(*) FROM public.vendors WHERE created_by = NEW.id), 0) * 5) +
    (COALESCE((SELECT COUNT(*) FROM public.reviews WHERE user_id = NEW.id), 0) * 5) +
    (COALESCE((SELECT COUNT(*) FROM public.costs WHERE created_by = NEW.id), 0) * 5)
  INTO calculated_points;
  
  -- Calculate points from history
  SELECT COALESCE(SUM(points_earned), 0)
  INTO history_points
  FROM public.user_point_history
  WHERE user_id = NEW.id AND activity_type != 'system_correction';
  
  -- Log warning if there's a significant discrepancy (more than 5 points difference)
  IF ABS(calculated_points - COALESCE(NEW.points, 0)) > 5 THEN
    INSERT INTO public.user_point_history (
      user_id,
      activity_type,
      points_earned,
      description
    ) VALUES (
      NEW.id,
      'validation_warning',
      0,
      'Point validation warning: User has ' || COALESCE(NEW.points, 0) || ' points but activities suggest ' || calculated_points
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for point validation on user updates
DROP TRIGGER IF EXISTS trg_validate_user_points ON public.users;
CREATE TRIGGER trg_validate_user_points
  AFTER UPDATE OF points ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_points_consistency();