-- Update handle_new_user function to send admin notifications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_community text;
  user_signup_source text;
BEGIN
  -- Insert or update user record with ON CONFLICT handling
  INSERT INTO public.users (
    id,
    email,
    name,
    address,
    street_name,
    signup_source,
    is_verified,
    points,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data->>'address', 'Address Not Provided'),
    COALESCE(NEW.raw_user_meta_data->>'street_name', public.street_only(COALESCE(NEW.raw_user_meta_data->>'address', ''))),
    COALESCE(NEW.raw_user_meta_data->>'signup_source', 'auth_trigger'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'signup_source' LIKE 'community:%' 
        OR NEW.raw_user_meta_data->>'signup_source' LIKE 'homepage:%' 
      THEN true 
      ELSE false 
    END,
    5, -- Welcome bonus points
    NEW.created_at
  ) ON CONFLICT (email) DO UPDATE SET
    -- For re-registration cases, update with fresh data but preserve some existing info
    id = EXCLUDED.id,
    name = COALESCE(EXCLUDED.name, users.name),
    address = COALESCE(EXCLUDED.address, users.address),
    street_name = COALESCE(EXCLUDED.street_name, users.street_name),
    signup_source = COALESCE(EXCLUDED.signup_source, users.signup_source),
    is_verified = COALESCE(EXCLUDED.is_verified, users.is_verified),
    -- Don't reduce points on re-registration
    points = GREATEST(EXCLUDED.points, COALESCE(users.points, 0)),
    created_at = COALESCE(users.created_at, EXCLUDED.created_at),
    updated_at = now();
  
  -- Only log welcome points for truly new users (not updates)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_point_history 
    WHERE user_id = NEW.id AND activity_type = 'join_site'
  ) THEN
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
  END IF;

  -- Determine community for notification
  user_signup_source := COALESCE(NEW.raw_user_meta_data->>'signup_source', 'auth_trigger');
  
  -- Extract community from signup source or detect from address
  IF user_signup_source LIKE 'community:%' THEN
    user_community := public.slug_to_community_name(split_part(user_signup_source, ':', 2));
  ELSE
    -- Try to detect community from address
    SELECT h.hoa_name INTO user_community
    FROM public.household_hoa h
    WHERE h.normalized_address = public.normalize_address(COALESCE(NEW.raw_user_meta_data->>'address', ''))
    LIMIT 1;
    
    -- If no HOA mapping found, set default
    user_community := COALESCE(user_community, 'Unknown Community');
  END IF;

  -- Send admin notification (only for truly new users)
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = NEW.email AND id != NEW.id
  ) THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://iuxacgyocpwblpmmbwwc.supabase.co/functions/v1/send-admin-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1eGFjZ3lvY3B3YmxwbW1id3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc3MzgzNCwiZXhwIjoyMDcwMzQ5ODM0fQ.pWFt2rKfkrIK0pI8H4hZLOPmM4BpKKJU8QMx2L6KXSM'
        ),
        body := jsonb_build_object(
          'userEmail', NEW.email,
          'userName', COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
          'userAddress', COALESCE(NEW.raw_user_meta_data->>'address', 'Address Not Provided'),
          'community', user_community,
          'signupSource', user_signup_source
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail signup process
        RAISE WARNING 'Failed to send admin notification for user %: %', NEW.email, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup process
    RAISE WARNING 'Error in handle_new_user trigger for email %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;