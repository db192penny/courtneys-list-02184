
-- 1) Make these users Site Admins (can approve users)
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from public.users u
where lower(u.email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com')
on conflict (user_id, role) do nothing;

-- 2) Make these users HOA Admins for Boca Bridges (can approve households)
insert into public.hoa_admins (user_id, hoa_name)
select u.id, 'Boca Bridges'
from public.users u
where lower(u.email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com')
and not exists (
  select 1 from public.hoa_admins h
  where h.user_id = u.id and lower(h.hoa_name) = lower('Boca Bridges')
);

-- 3) Map their addresses to "Boca Bridges" so HOA shows on "Your Home"
--    (Only inserts a row if the user already has a non-empty address saved)
insert into public.household_hoa (household_address, hoa_name, created_by)
select public.normalize_address(u.address), 'Boca Bridges', u.id
from public.users u
where lower(u.email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com')
  and coalesce(u.address, '') <> ''
  and not exists (
    select 1
    from public.household_hoa h
    where h.household_address = public.normalize_address(u.address)
  );
