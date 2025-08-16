-- Create function to clean up orphaned users
CREATE OR REPLACE FUNCTION public.admin_cleanup_orphaned_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get email for logging
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
  
  -- Delete the orphaned user from auth.users
  DELETE FROM auth.users WHERE id = _user_id;
  
  -- Log the cleanup
  INSERT INTO public.admin_audit_log (actor_id, action, target_id, metadata)
  VALUES (auth.uid(), 'cleanup_orphaned_user', _user_id, jsonb_build_object('email', user_email));

  RETURN true;
END;
$function$