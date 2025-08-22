-- Improve handle_new_user trigger to better handle re-registration cases
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  -- Check if this is a new insert by seeing if the user already has point history
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
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup process
    RAISE WARNING 'Error in handle_new_user trigger for email %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;