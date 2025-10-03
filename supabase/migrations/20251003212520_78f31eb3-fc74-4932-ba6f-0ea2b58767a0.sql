
-- Fix get_my_hoa() function to use correct normalized address comparison
CREATE OR REPLACE FUNCTION public.get_my_hoa()
 RETURNS TABLE(hoa_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select h.hoa_name
  from public.users u
  join public.household_hoa h
    on h.normalized_address = public.normalize_address(u.address)
  where u.id = auth.uid()
  limit 1;
$function$;
