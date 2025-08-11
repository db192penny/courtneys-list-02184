-- Create function to check email status without requiring authentication
-- Status logic:
--  - not_found: no user record with that email
--  - approved: user exists AND their household address is approved
--  - pending: user exists but household not approved yet

create or replace function public.get_email_status(_email text)
returns text
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  u_addr text;
begin
  select u.address into u_addr
  from public.users u
  where lower(u.email) = lower(trim(_email))
  limit 1;

  if u_addr is null then
    return 'not_found';
  end if;

  if public.is_household_approved(u_addr) then
    return 'approved';
  else
    return 'pending';
  end if;
end;
$$;