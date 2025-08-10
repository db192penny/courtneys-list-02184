
-- Enable RLS on core tables
alter table if exists public.users enable row level security;
alter table if exists public.invitations enable row level security;
alter table if exists public.vendors enable row level security;
alter table if exists public.reviews enable row level security;
alter table if exists public.communities enable row level security;

-- USERS policies (owner-only)
drop policy if exists "Users can select own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

create policy "Users can select own profile"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- INVITATIONS: let creators see their own invites (validation via RPC below)
drop policy if exists "Invite creators can view their invites" on public.invitations;

create policy "Invite creators can view their invites"
  on public.invitations
  for select
  to authenticated
  using (invited_by = auth.uid());

-- VENDORS policies
drop policy if exists "Anyone authenticated can read vendors" on public.vendors;
drop policy if exists "Users can insert vendors they create" on public.vendors;
drop policy if exists "Users can update their vendors" on public.vendors;
drop policy if exists "Users can delete their vendors" on public.vendors;

-- READ: allow all authenticated (UI will gate sensitive fields in MVP)
create policy "Anyone authenticated can read vendors"
  on public.vendors
  for select
  to authenticated
  using (true);

-- INSERT: only when created_by = auth.uid()
create policy "Users can insert vendors they create"
  on public.vendors
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- UPDATE/DELETE: only creator
create policy "Users can update their vendors"
  on public.vendors
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Users can delete their vendors"
  on public.vendors
  for delete
  to authenticated
  using (created_by = auth.uid());

-- REVIEWS policies
drop policy if exists "Anyone authenticated can read reviews" on public.reviews;
drop policy if exists "Users can insert their reviews" on public.reviews;
drop policy if exists "Users can update their reviews" on public.reviews;
drop policy if exists "Users can delete their reviews" on public.reviews;

create policy "Anyone authenticated can read reviews"
  on public.reviews
  for select
  to authenticated
  using (true);

create policy "Users can insert their reviews"
  on public.reviews
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their reviews"
  on public.reviews
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their reviews"
  on public.reviews
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Helper function to check verification status
create or replace function public.is_verified(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select u.is_verified from public.users u where u.id = _uid), false);
$$;

revoke all on function public.is_verified(uuid) from public;
grant execute on function public.is_verified(uuid) to authenticated;

-- Secure invite validation function
create or replace function public.validate_invite(_token text)
returns table(invite_id uuid, invited_email text, status text, accepted boolean, created_at timestamp)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.invited_email, i.status, (i.accepted_at is not null) as accepted, i.created_at
  from public.invitations i
  where i.invite_token = _token
  limit 1;
$$;

revoke all on function public.validate_invite(text) from public;
grant execute on function public.validate_invite(text) to anon, authenticated;

-- Mark invite accepted after successful signup
create or replace function public.mark_invite_accepted(_token text, _user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.invitations
  set accepted_at = coalesce(accepted_at, now()),
      status = 'accepted',
      invited_by = coalesce(invited_by, _user_id)
  where invite_token = _token
    and (accepted_at is null or status <> 'accepted');

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.mark_invite_accepted(text, uuid) from public;
grant execute on function public.mark_invite_accepted(text, uuid) to authenticated;

-- Trigger to auto-verify user on first vendor submission
create or replace function public.handle_vendor_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    update public.users
    set submissions_count = coalesce(submissions_count, 0) + 1,
        is_verified = true
    where id = new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_vendor_insert on public.vendors;
create trigger on_vendor_insert
after insert on public.vendors
for each row
execute function public.handle_vendor_insert();
