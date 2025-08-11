-- Approve household for db@fivefourventures.com so get_email_status returns 'approved'
with u as (
  select id, address
  from public.users
  where lower(email) = 'db@fivefourventures.com'
  limit 1
)
insert into public.approved_households (household_address, hoa_name, approved_by)
select public.normalize_address(u.address) as household_address,
       'Boca Bridges' as hoa_name,
       u.id as approved_by
from u
where coalesce(u.address, '') <> ''
  and not exists (
    select 1 from public.approved_households ah
    where ah.household_address = public.normalize_address(u.address)
  );