-- Update auto-verification function to include homepage users
CREATE OR REPLACE FUNCTION public.auto_verify_community_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-verify users who signed up via community links or from homepage
  IF NEW.signup_source IS NOT NULL AND (
    NEW.signup_source LIKE 'community:%' OR 
    NEW.signup_source LIKE 'homepage:%'
  ) THEN
    NEW.is_verified := true;
  END IF;
  
  RETURN NEW;
END;
$function$;