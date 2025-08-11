-- Map and approve households for the specified users, verify them, and grant admin roles
-- Idempotent operations

-- 1) Ensure household -> HOA mapping for the two users
insert into public.household_hoa (id, created_by, household_address, normalized_address, hoa_name, created_at, updated_at)
select gen_random_uuid(), u.id,
       public.normalize_address(u.address) as household_address,
       public.normalize_address(u.address) as normalized_address,
       'Boca Bridges' as hoa_name,
       now(), now()
from public.users u
where lower(u.email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com')
  and u.address is not null
  and not exists (
    select 1 from public.household_hoa h
    where h.household_address = public.normalize_address(u.address)
  );

-- 2) Approve those households
insert into public.approved_households (household_address, hoa_name, approved_by, approved_at)
select public.normalize_address(u.address) as household_address,
       'Boca Bridges' as hoa_name,
       u.id as approved_by,
       now()
from public.users u
where lower(u.email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com')
  and u.address is not null
  and not exists (
    select 1 from public.approved_households ah
    where ah.household_address = public.normalize_address(u.address)
  );

-- 3) Mark users as verified
update public.users
set is_verified = true
where lower(email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com');

-- 4) Grant HOA admin to db@fivefourventures.com for Boca Bridges
insert into public.hoa_admins (user_id, hoa_name)
select u.id, 'Boca Bridges'
from public.users u
where lower(u.email) = 'db@fivefourventures.com'
  and not exists (
    select 1 from public.hoa_admins ha
    where ha.user_id = u.id
      and lower(ha.hoa_name) = lower('Boca Bridges')
  );

-- 5) Grant site admin role to db@fivefourventures.com (for managing users)
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from public.users u
where lower(u.email) = 'db@fivefourventures.com'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and ur.role = 'admin'::public.app_role
  );