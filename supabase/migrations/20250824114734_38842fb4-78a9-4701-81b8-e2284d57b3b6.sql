-- TARGETED POINT SYSTEM FIX - Only affects point-related triggers and functions
-- This migration only modifies point calculation logic, leaving all other functionality intact

-- Step 1: Drop existing point-related triggers first
DROP TRIGGER IF EXISTS trigger_vendor_points ON public.vendors;
DROP TRIGGER IF EXISTS trg_vendor_points_trigger ON public.vendors;
DROP TRIGGER IF EXISTS trg_cost_points_trigger ON public.costs;
DROP TRIGGER IF EXISTS trg_review_points_trigger ON public.reviews;
DROP TRIGGER IF EXISTS trg_rate_vendor_points_trigger ON public.reviews;
DROP TRIGGER IF EXISTS validate_user_points_trigger ON public.users;

-- Step 2: Now drop the point-related functions
DROP FUNCTION IF EXISTS public.trg_vendor_points();
DROP FUNCTION IF EXISTS public.trg_cost_points();
DROP FUNCTION IF EXISTS public.trg_review_points_with_history();
DROP FUNCTION IF EXISTS public.trg_rate_vendor_points_update();
DROP FUNCTION IF EXISTS public.trg_rate_vendor_points();
DROP FUNCTION IF EXISTS public.validate_user_points_consistency();

-- Step 3: Create the correct point triggers

-- Vendor submission points trigger (5 points) - only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_vendor_submission_points'
  ) THEN
    EXECUTE $$
    CREATE OR REPLACE FUNCTION public.trg_vendor_submission_points()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
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
    $$;
  END IF;
END $$;

-- Review submission points trigger (5 points) - only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_review_submission_points'
  ) THEN
    EXECUTE $$
    CREATE OR REPLACE FUNCTION public.trg_review_submission_points()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $function$
    BEGIN
      -- Award 5 points for each review submission
      UPDATE public.users 
      SET points = COALESCE(points, 0) + 5
      WHERE id = NEW.user_id;
      
      -- Log to point history
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
        'Reviewed vendor with ' || NEW.rating || ' stars',
        NEW.id
      );
      
      RETURN NEW;
    END;
    $function$;
    $$;
  END IF;
END $$;

-- Create triggers only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_vendor_submission_points_trigger' 
    AND event_object_table = 'vendors'
  ) THEN
    CREATE TRIGGER trg_vendor_submission_points_trigger
      AFTER INSERT ON public.vendors
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_vendor_submission_points();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_review_submission_points_trigger' 
    AND event_object_table = 'reviews'
  ) THEN
    CREATE TRIGGER trg_review_submission_points_trigger
      AFTER INSERT ON public.reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_review_submission_points();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_cost_submission_points_trigger' 
    AND event_object_table = 'costs'
  ) THEN
    CREATE TRIGGER trg_cost_submission_points_trigger
      AFTER INSERT ON public.costs
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_cost_points_with_history();
  END IF;
END $$;

-- Step 4: Clean up previous point correction entries
DELETE FROM public.user_point_history 
WHERE activity_type = 'system_correction' 
AND description LIKE '%Fixed points%';

-- Step 5: Recalculate all user points based on actual activities
DO $$
DECLARE
  user_record record;
  calculated_points integer;
  vendor_count integer;
  review_count integer;
  cost_count integer;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.points, u.name
    FROM public.users u
  LOOP
    -- Count actual activities for this user
    SELECT 
      COALESCE(COUNT(v.id), 0),
      COALESCE(COUNT(r.id), 0),
      COALESCE(COUNT(c.id), 0)
    INTO vendor_count, review_count, cost_count
    FROM public.users u
    LEFT JOIN public.vendors v ON v.created_by = u.id
    LEFT JOIN public.reviews r ON r.user_id = u.id
    LEFT JOIN public.costs c ON c.created_by = u.id
    WHERE u.id = user_record.id;
    
    -- Calculate correct points: 5 for joining + 5 per vendor + 5 per review + 5 per cost
    calculated_points := 5 + (vendor_count * 5) + (review_count * 5) + (cost_count * 5);
    
    -- Fix the points if they don't match
    IF COALESCE(user_record.points, 0) != calculated_points THEN
      UPDATE public.users 
      SET points = calculated_points 
      WHERE id = user_record.id;
      
      -- Log the correction in point history
      INSERT INTO public.user_point_history (
        user_id,
        activity_type,
        points_earned,
        description
      ) VALUES (
        user_record.id,
        'system_correction',
        calculated_points - COALESCE(user_record.points, 0),
        'Point correction: Fixed to ' || calculated_points || 
        ' (5 join + ' || (vendor_count * 5) || ' vendor + ' || 
        (review_count * 5) || ' review + ' || (cost_count * 5) || ' cost points)'
      );
    END IF;
  END LOOP;
END $$;