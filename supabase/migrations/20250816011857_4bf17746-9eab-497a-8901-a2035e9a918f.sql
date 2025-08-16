-- Fix admin_soft_delete_user function to handle all foreign key dependencies
CREATE OR REPLACE FUNCTION public.admin_soft_delete_user(_user_id uuid, _reason text DEFAULT 'admin_action'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_address text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Cache target address for potential use
  SELECT u.address INTO target_address FROM public.users u WHERE u.id = _user_id;

  -- Remove dependent content in proper order to avoid foreign key violations
  DELETE FROM public.reviews WHERE user_id = _user_id;
  DELETE FROM public.costs WHERE created_by = _user_id;
  DELETE FROM public.home_vendors WHERE user_id = _user_id;
  DELETE FROM public.invitations WHERE invited_by = _user_id;
  DELETE FROM public.vendors WHERE created_by = _user_id; -- user-created vendors
  
  -- Remove user-specific administrative data
  DELETE FROM public.approved_households WHERE approved_by = _user_id;
  DELETE FROM public.hoa_admins WHERE user_id = _user_id;
  DELETE FROM public.user_point_history WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Finally remove user row
  DELETE FROM public.users WHERE id = _user_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_id, metadata)
  VALUES (auth.uid(), 'soft_delete_user', _user_id, jsonb_build_object('reason', _reason, 'address', target_address));

  RETURN true;
END;
$function$