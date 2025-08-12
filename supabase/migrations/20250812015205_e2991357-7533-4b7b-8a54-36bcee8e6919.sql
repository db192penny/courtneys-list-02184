-- 1) Create storage bucket for community photos (public read)
insert into storage.buckets (id, name, public)
values ('community-photos', 'community-photos', true)
on conflict (id) do nothing;

-- Public read policy for the bucket
create policy "Public can view community photos"
  on storage.objects for select
  using (bucket_id = 'community-photos');

-- HOA admins can insert under their HOA folder (first path segment must match their HOA)
create policy "HOA admins can upload community photos"
  on storage.objects for insert
  with check (
    bucket_id = 'community-photos'
    and is_user_hoa_admin()
    and exists (
      select 1 from get_my_hoa() g
      where lower(g.hoa_name) = lower((storage.foldername(name))[1])
    )
  );

-- HOA admins can update their HOA photos
create policy "HOA admins can update community photos"
  on storage.objects for update
  using (
    bucket_id = 'community-photos'
    and is_user_hoa_admin()
    and exists (
      select 1 from get_my_hoa() g
      where lower(g.hoa_name) = lower((storage.foldername(name))[1])
    )
  )
  with check (
    bucket_id = 'community-photos'
    and is_user_hoa_admin()
    and exists (
      select 1 from get_my_hoa() g
      where lower(g.hoa_name) = lower((storage.foldername(name))[1])
    )
  );

-- HOA admins can delete their HOA photos
create policy "HOA admins can delete community photos"
  on storage.objects for delete
  using (
    bucket_id = 'community-photos'
    and is_user_hoa_admin()
    and exists (
      select 1 from get_my_hoa() g
      where lower(g.hoa_name) = lower((storage.foldername(name))[1])
    )
  );

-- 2) Create community_assets table
create table if not exists public.community_assets (
  hoa_name text primary key,
  photo_path text,
  address_line text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.community_assets enable row level security;

-- Anyone can read community assets
create policy "Anyone can read community assets"
  on public.community_assets for select
  using (true);

-- HOA admins can insert their own HOA asset row
create policy "HOA admins can insert community asset"
  on public.community_assets for insert
  with check (
    is_user_hoa_admin() and exists (
      select 1 from get_my_hoa() g where lower(g.hoa_name) = lower(hoa_name)
    )
  );

-- HOA admins can update their own HOA asset row
create policy "HOA admins can update community asset"
  on public.community_assets for update
  using (
    is_user_hoa_admin() and exists (
      select 1 from get_my_hoa() g where lower(g.hoa_name) = lower(hoa_name)
    )
  )
  with check (
    is_user_hoa_admin() and exists (
      select 1 from get_my_hoa() g where lower(g.hoa_name) = lower(hoa_name)
    )
  );

-- HOA admins can delete their HOA asset row
create policy "HOA admins can delete community asset"
  on public.community_assets for delete
  using (
    is_user_hoa_admin() and exists (
      select 1 from get_my_hoa() g where lower(g.hoa_name) = lower(hoa_name)
    )
  );

-- Triggers: drop if exists then create
DROP TRIGGER IF EXISTS update_community_assets_updated_at ON public.community_assets;
create trigger update_community_assets_updated_at
before update on public.community_assets
for each row execute function public.update_updated_at_column();

create or replace function public.set_updated_by()
returns trigger as $$
begin
  new.updated_by := auth.uid();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

DROP TRIGGER IF EXISTS set_community_assets_updated_by ON public.community_assets;
create trigger set_community_assets_updated_by
before insert or update on public.community_assets
for each row execute function public.set_updated_by();