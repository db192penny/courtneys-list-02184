
-- Ensure HOA mapping, household approval, and user verification for the two emails

with target_users as (
  select id, email, address
  from public.users
  where lower(email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com')
),
normed as (
  select id, email, address, public.normalize_address(address) as norm_addr
  from target_users
  where coalesce(address, '') <> ''
)

-- 1) Map normalized address to Boca Bridges in household_hoa (only if missing)
insert into public.household_hoa (household_address, normalized_address, hoa_name, created_by)
select n.norm_addr, n.norm_addr, 'Boca Bridges' as hoa_name, n.id as created_by
from normed n
where not exists (
  select 1 from public.household_hoa h
  where h.household_address = n.norm_addr
);

-- 2) Approve the household(s) in approved_households (only if missing)
insert into public.approved_households (household_address, hoa_name, approved_by)
select n.norm_addr, 'Boca Bridges', n.id
from normed n
where not exists (
  select 1 from public.approved_households ah
  where ah.household_address = n.norm_addr
);

-- 3) Mark both users as verified
update public.users u
set is_verified = true
where lower(u.email) in ('db@fivefourventures.com', 'davebirnbaum@gmail.com');

-- 4) Ensure db@fivefourventures.com is Site Admin (no-op if already set)
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from public.users u
where lower(u.email) = 'db@fivefourventures.com'
on conflict (user_id, role) do nothing;
