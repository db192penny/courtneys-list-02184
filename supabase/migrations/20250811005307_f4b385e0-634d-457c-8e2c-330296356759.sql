-- 1) Tables
create table if not exists public.approved_households (
  household_address text primary key,
  hoa_name          text not null,
  approved_by       uuid not null references public.users(id),
  approved_at       timestamp without time zone not null default now()
);

create index if not exists idx_approved_households_hoa
  on public.approved_households(hoa_name);

create table if not exists public.hoa_admins (
  hoa_name text primary key,
  user_id  uuid not null references public.users(id)
);

create index if not exists idx_hoa_admins_user on public.hoa_admins(user_id);

-- Enable RLS where needed
alter table public.approved_households enable row level security;
alter table public.hoa_admins enable row level security;

-- 2) Helper functions and corrections
-- Fix vendor_cost_stats to use household_address join
create or replace function public.vendor_cost_stats(_vendor_id uuid, _hoa_name text)
returns table(avg_amount numeric, sample_size integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(round(avg(c.amount)::numeric, 2), 0)::numeric(12,2) as avg_amount,
    count(*)::int as sample_size
  from public.costs c
  join public.household_hoa h
    on h.household_address = c.household_address
  where c.vendor_id = _vendor_id
    and lower(h.hoa_name) = lower(trim(_hoa_name));
$$;

alter function public.vendor_cost_stats(uuid, text) owner to postgres;
grant execute on function public.vendor_cost_stats(uuid, text) to authenticated;

-- Is a given address approved?
create or replace function public.is_household_approved(_addr text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.approved_households ah
    where ah.household_address = public.normalize_address(_addr)
  );
$$;

alter function public.is_household_approved(text) owner to postgres;
grant execute on function public.is_household_approved(text) to authenticated;

-- Is current user approved by their address?
create or replace function public.is_user_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_household_approved(u.address)
  from public.users u
  where u.id = auth.uid();
$$;

alter function public.is_user_approved() owner to postgres;
grant execute on function public.is_user_approved() to authenticated;

-- get_my_hoa helper (correct household_address usage)
create or replace function public.get_my_hoa()
returns table(hoa_name text)
language sql
stable
security definer
set search_path = public
as $$
  select h.hoa_name
  from public.users u
  join public.household_hoa h
    on h.household_address = public.normalize_address(u.address)
  where u.id = auth.uid()
  limit 1;
$$;

alter function public.get_my_hoa() owner to postgres;
grant execute on function public.get_my_hoa() to authenticated;

-- Is current user an admin for their HOA?
create or replace function public.is_user_hoa_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select u.id, h.hoa_name
    from public.users u
    join public.household_hoa h
      on h.household_address = public.normalize_address(u.address)
    where u.id = auth.uid()
  )
  select exists(
    select 1 from me
    join public.hoa_admins a on lower(a.hoa_name) = lower(me.hoa_name) and a.user_id = me.id
  );
$$;

alter function public.is_user_hoa_admin() owner to postgres;
grant execute on function public.is_user_hoa_admin() to authenticated;

-- Admin RPC: list pending households in admin's HOA
create or replace function public.admin_list_pending_households()
returns table(household_address text, hoa_name text, first_seen timestamp without time zone)
language sql
stable
security definer
set search_path = public
as $$
  with my_hoa as (
    select hoa_name from public.get_my_hoa() limit 1
  )
  select
    h.household_address,
    h.hoa_name,
    min(u.created_at) as first_seen
  from public.household_hoa h
  join public.users u
    on public.normalize_address(u.address) = h.household_address
  left join public.approved_households ah
    on ah.household_address = h.household_address
  join my_hoa m on lower(h.hoa_name) = lower(m.hoa_name)
  where ah.household_address is null
  group by h.household_address, h.hoa_name
  order by first_seen asc nulls last;
$$;

alter function public.admin_list_pending_households() owner to postgres;
grant execute on function public.admin_list_pending_households() to authenticated;

-- Admin RPC: approve a household in own HOA
create or replace function public.admin_approve_household(_addr text)
returns table(approved boolean, address text, hoa_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_norm text;
  target_hoa  text;
  is_admin    boolean;
begin
  target_norm := public.normalize_address(_addr);

  select h.hoa_name into target_hoa
  from public.household_hoa h
  where h.household_address = target_norm
  limit 1;

  if target_hoa is null then
    return query select false, target_norm, null::text;
    return;
  end if;

  is_admin := public.is_user_hoa_admin();
  if not is_admin then
    raise exception 'Not authorized';
  end if;

  if not exists (select 1 from public.get_my_hoa() g where lower(g.hoa_name) = lower(target_hoa)) then
    raise exception 'Not authorized for this HOA';
  end if;

  insert into public.approved_households (household_address, hoa_name, approved_by)
  values (target_norm, target_hoa, auth.uid())
  on conflict (household_address) do nothing;

  return query select true, target_norm, target_hoa;
end;
$$;

alter function public.admin_approve_household(text) owner to postgres;
grant execute on function public.admin_approve_household(text) to authenticated;

-- 3) RLS policies for approved_households (RPC-only writes)
drop policy if exists "Admins can read approved households for their HOA" on public.approved_households;
create policy "Admins can read approved households for their HOA"
  on public.approved_households
  for select
  to authenticated
  using (
    public.is_user_hoa_admin()
    and exists (
      select 1 from public.get_my_hoa() g
      where lower(g.hoa_name) = lower(approved_households.hoa_name)
    )
  );

drop policy if exists "Admins can approve households for their HOA" on public.approved_households;
create policy "Admins can approve households for their HOA"
  on public.approved_households
  for insert
  to authenticated
  with check (
    public.is_user_hoa_admin()
    and exists (
      select 1 from public.get_my_hoa() g
      where lower(g.hoa_name) = lower(approved_households.hoa_name)
    )
  );

-- Optional: allow admins to read their own hoa_admins row in UI
drop policy if exists "Admins can read their own HOA admin row" on public.hoa_admins;
create policy "Admins can read their own HOA admin row"
  on public.hoa_admins
  for select
  to authenticated
  using (
    exists (
      select 1 from public.get_my_hoa() g
      where lower(g.hoa_name) = lower(hoa_admins.hoa_name)
    )
  );