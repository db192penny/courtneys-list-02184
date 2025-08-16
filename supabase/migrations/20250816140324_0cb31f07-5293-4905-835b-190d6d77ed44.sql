-- Fix double join points and clean up validation messages

-- First, let's create a function to clean up duplicate join points
CREATE OR REPLACE FUNCTION fix_duplicate_join_points()
RETURNS TABLE(user_id uuid, old_points integer, new_points integer, removed_duplicates integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record record;
  join_count integer;
  duplicate_count integer;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.points
    FROM public.users u
  LOOP
    -- Count how many join_site entries this user has
    SELECT COUNT(*) INTO join_count
    FROM public.user_point_history
    WHERE user_id = user_record.id AND activity_type = 'join_site';
    
    -- If more than 1, we have duplicates
    IF join_count > 1 THEN
      duplicate_count := join_count - 1;
      
      -- Remove the duplicate entries (keep the oldest one)
      DELETE FROM public.user_point_history 
      WHERE user_id = user_record.id 
        AND activity_type = 'join_site'
        AND id NOT IN (
          SELECT id FROM public.user_point_history 
          WHERE user_id = user_record.id AND activity_type = 'join_site'
          ORDER BY created_at ASC 
          LIMIT 1
        );
      
      -- Correct the user's points (subtract the duplicate points)
      UPDATE public.users 
      SET points = points - (duplicate_count * 5)
      WHERE id = user_record.id;
      
      -- Return the fix details
      user_id := user_record.id;
      old_points := user_record.points;
      new_points := user_record.points - (duplicate_count * 5);
      removed_duplicates := duplicate_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Run the cleanup function
SELECT * FROM fix_duplicate_join_points();

-- Now let's fix the trigger system to prevent future duplicates
-- Drop the old trigger that was causing duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_auth_user_created function to be more careful
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create if email is confirmed and no existing record
  IF NEW.email_confirmed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    BEGIN
      INSERT INTO public.users (
        id,
        email,
        name,
        address,
        street_name,
        signup_source,
        is_verified,
        created_at,
        show_name_public
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'address', 'Address Pending'),
        COALESCE(NEW.raw_user_meta_data->>'street_name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'signup_source', 'auto_trigger'),
        true,
        NEW.created_at,
        true
      );
      
      -- Only award join points if no join_site entry exists for this user
      IF NOT EXISTS(SELECT 1 FROM public.user_point_history WHERE user_id = NEW.id AND activity_type = 'join_site') THEN
        -- Award join points
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
          'Joined via auto-trigger'
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't block auth
      RAISE LOG 'Failed to auto-create public.users record for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also update the award_join_points function to check for duplicates
CREATE OR REPLACE FUNCTION public.award_join_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only award join points if no join_site entry exists for this user
  IF NOT EXISTS(SELECT 1 FROM public.user_point_history WHERE user_id = NEW.id AND activity_type = 'join_site') THEN
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger (this was probably missing)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();