-- Update admin_soft_delete_user to also delete from auth.users
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

  -- Remove from public.users
  DELETE FROM public.users WHERE id = _user_id;
  
  -- COMPLETELY remove from auth.users to allow re-registration
  DELETE FROM auth.users WHERE id = _user_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_id, metadata)
  VALUES (auth.uid(), 'complete_delete_user', _user_id, jsonb_build_object('reason', _reason, 'address', target_address));

  RETURN true;
END;
$function$

-- Create function to list all users including orphaned ones
CREATE OR REPLACE FUNCTION public.admin_list_all_users()
RETURNS TABLE(
  id uuid, 
  email text, 
  name text, 
  address text,
  is_verified boolean, 
  signup_source text,
  points integer,
  created_at timestamp with time zone,
  is_orphaned boolean,
  email_confirmed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  -- Users in both auth and public tables (normal users)
  SELECT 
    pu.id,
    pu.email,
    pu.name,
    pu.address,
    pu.is_verified,
    pu.signup_source,
    pu.points,
    pu.created_at::timestamp with time zone,
    false as is_orphaned,
    au.email_confirmed_at
  FROM public.users pu
  JOIN auth.users au ON au.id = pu.id
  
  UNION ALL
  
  -- Orphaned users (in auth but not in public)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Unknown User') as name,
    COALESCE(au.raw_user_meta_data->>'address', 'No Address') as address,
    false as is_verified,
    COALESCE(au.raw_user_meta_data->>'signup_source', 'orphaned') as signup_source,
    0 as points,
    au.created_at,
    true as is_orphaned,
    au.email_confirmed_at
  FROM auth.users au
  LEFT JOIN public.users pu ON pu.id = au.id
  WHERE pu.id IS NULL
    AND au.email_confirmed_at IS NOT NULL
  
  ORDER BY created_at DESC NULLS LAST;
END;
$function$

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