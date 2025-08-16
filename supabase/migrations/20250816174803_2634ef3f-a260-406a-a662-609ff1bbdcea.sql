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