-- Fix get_email_status function to properly prioritize checks
CREATE OR REPLACE FUNCTION public.get_email_status(_email text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  user_record record;
  user_hoa_name text;
begin
  -- Get user data
  select u.id, u.address, u.is_verified into user_record
  from public.users u
  where lower(u.email) = lower(trim(_email))
  limit 1;

  if user_record.id is null then
    return 'not_found';
  end if;

  -- 1. Check if user is admin (highest priority)
  if public.has_role(user_record.id, 'admin'::public.app_role) then
    return 'approved';
  end if;

  -- 2. Check if user is verified (manually approved)
  if coalesce(user_record.is_verified, false) then
    return 'approved';
  end if;

  -- 3. Check if user is HOA admin for their community
  select h.hoa_name into user_hoa_name
  from public.household_hoa h
  where h.household_address = public.normalize_address(user_record.address)
  limit 1;

  if user_hoa_name is not null then
    if exists (
      select 1 from public.hoa_admins ha
      where ha.user_id = user_record.id 
      and lower(ha.hoa_name) = lower(user_hoa_name)
    ) then
      return 'approved';
    end if;
  end if;

  -- 4. Check household approval (fallback)
  if public.is_household_approved(user_record.address) then
    return 'approved';
  else
    return 'pending';
  end if;
end;
$function$