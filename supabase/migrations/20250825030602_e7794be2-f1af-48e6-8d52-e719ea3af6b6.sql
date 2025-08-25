-- Drop and recreate admin_list_all_users function to include community information
DROP FUNCTION IF EXISTS public.admin_list_all_users();

CREATE OR REPLACE FUNCTION public.admin_list_all_users()
 RETURNS TABLE(id uuid, email text, name text, address text, is_verified boolean, signup_source text, points integer, created_at timestamp with time zone, is_orphaned boolean, email_confirmed_at timestamp with time zone, hoa_name text)
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
    au.email_confirmed_at,
    hh.hoa_name
  FROM public.users pu
  JOIN auth.users au ON au.id = pu.id
  LEFT JOIN public.household_hoa hh ON hh.normalized_address = public.normalize_address(pu.address)
  
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
    au.email_confirmed_at,
    hh_orphan.hoa_name
  FROM auth.users au
  LEFT JOIN public.users pu ON pu.id = au.id
  LEFT JOIN public.household_hoa hh_orphan ON hh_orphan.normalized_address = public.normalize_address(COALESCE(au.raw_user_meta_data->>'address', ''))
  WHERE pu.id IS NULL
    AND au.email_confirmed_at IS NOT NULL
  
  ORDER BY created_at DESC NULLS LAST;
END;
$function$