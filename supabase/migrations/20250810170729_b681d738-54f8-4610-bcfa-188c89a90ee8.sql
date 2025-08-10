
-- 1) Community Requests table + RLS (public inserts; no public reads)
create table if not exists public.community_requests (
  id uuid primary key default gen_random_uuid(),
  community_name text not null,
  location text,
  requestor_name text,
  requestor_email text,
  notes text,
  created_at timestamp without time zone not null default now()
);

alter table public.community_requests enable row level security;

-- Allow both unauthenticated (anon) and authenticated clients to insert
create policy if not exists "Anyone can create community requests"
  on public.community_requests
  for insert
  to anon, authenticated
  with check (true);

-- Optional helpful index for potential backoffice/admin listing later
create index if not exists community_requests_created_at_idx
  on public.community_requests (created_at);


-- 2) Reviews rating validation trigger (1..5 inclusive)
create or replace function public.validate_review_rating()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.rating is null or new.rating < 1 or new.rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_review_rating on public.reviews;

create trigger trg_validate_review_rating
  before insert or update on public.reviews
  for each row
  execute function public.validate_review_rating();


-- 3) Attach vendor insert trigger to auto-increment submissions_count and set is_verified
-- (Uses existing function public.handle_vendor_insert)
drop trigger if exists trg_handle_vendor_insert on public.vendors;

create trigger trg_handle_vendor_insert
  after insert on public.vendors
  for each row
  execute function public.handle_vendor_insert();


-- 4) Useful indexes
create index if not exists vendors_category_idx on public.vendors (category);
create index if not exists vendors_created_by_idx on public.vendors (created_by);
create index if not exists vendors_created_at_idx on public.vendors (created_at);

create index if not exists reviews_vendor_id_idx on public.reviews (vendor_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at);

create index if not exists users_is_verified_idx on public.users (is_verified);

-- Fast lookups during invite validation
create index if not exists invitations_invite_token_idx on public.invitations (invite_token);


-- 5) Update mark_invite_accepted to also verify the user upon acceptance
create or replace function public.mark_invite_accepted(_token text, _user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  if updated_count > 0 and _user_id is not null then
    update public.users
    set is_verified = true
    where id = _user_id;
  end if;

  return updated_count > 0;
end;
$function$;
