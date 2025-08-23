-- Update handle_new_user function to auto-verify all confirmed email users
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
      ELSE true  -- Changed from false to true - auto-verify all confirmed users
    END,
    5, -- Join bonus points
    NEW.created_at
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    address = COALESCE(EXCLUDED.address, users.address),
    street_name = COALESCE(EXCLUDED.street_name, users.street_name),
    signup_source = COALESCE(EXCLUDED.signup_source, users.signup_source),
    is_verified = EXCLUDED.is_verified,
    updated_at = now();

  -- Award join points in history
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

  -- Auto-create HOA mapping for community signups
  IF NEW.raw_user_meta_data->>'signup_source' IS NOT NULL AND NEW.raw_user_meta_data->>'signup_source' LIKE 'community:%' THEN
    user_signup_source := NEW.raw_user_meta_data->>'signup_source';
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
  
  RETURN NEW;
END;
$function$;