-- Remove ONLY the admin notification block from handle_new_user function
-- This surgically removes lines 76-96 (the net.http_post call) while keeping all other functionality intact

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
      WHEN NEW.raw_user_meta_data->>'signup_source' IS NOT NULL AND (
        NEW.raw_user_meta_data->>'signup_source' LIKE 'community:%' OR 
        NEW.raw_user_meta_data->>'signup_source' LIKE 'homepage:%'
      ) THEN true
      ELSE false
    END,
    5, -- Welcome points
    COALESCE(NEW.created_at, now())
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    address = COALESCE(EXCLUDED.address, public.users.address),
    street_name = COALESCE(EXCLUDED.street_name, public.users.street_name),
    signup_source = COALESCE(EXCLUDED.signup_source, public.users.signup_source),
    is_verified = EXCLUDED.is_verified,
    points = EXCLUDED.points,
    created_at = COALESCE(EXCLUDED.created_at, public.users.created_at);

  -- Log welcome points
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
  ) ON CONFLICT DO NOTHING;

  -- Handle community signup sources
  user_signup_source := NEW.raw_user_meta_data->>'signup_source';
  IF user_signup_source IS NOT NULL AND user_signup_source LIKE 'community:%' THEN
    user_community := public.slug_to_community_name(split_part(user_signup_source, ':', 2));
    
    INSERT INTO public.household_hoa (
      household_address,
      normalized_address,
      hoa_name,
      created_by
    ) VALUES (
      COALESCE(NEW.raw_user_meta_data->>'address', 'Address Not Provided'),
      public.normalize_address(COALESCE(NEW.raw_user_meta_data->>'address', 'Address Not Provided')),
      user_community,
      NEW.id
    ) ON CONFLICT (normalized_address) DO NOTHING;
  END IF;

  -- NOTE: Admin notification is now handled by frontend after successful signup
  -- This removes the problematic net.http_post() call that was causing authentication issues

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;