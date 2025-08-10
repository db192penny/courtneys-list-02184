-- Create users profile table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  is_anonymous boolean not null default false,
  is_verified boolean not null default false,
  submissions_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS for users
alter table public.users enable row level security;

-- Policies for users
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Shared function to auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for users.updated_at
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.update_updated_at_column();

-- Invitations table to support invite flow
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  invite_token text not null unique,
  invited_email text not null,
  status text not null default 'pending',
  invited_by uuid null references public.users(id) on delete set null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now()
);

-- Enable RLS for invitations (no public access; functions use SECURITY DEFINER)
alter table public.invitations enable row level security;

-- Optional: allow admins to manage invitations later (no broad policies now)

-- Vendors table to support submissions
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  contact text,
  phone text,
  email text,
  website text,
  average_cost text,
  rating integer check (rating between 1 and 5),
  comments text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Enable RLS for vendors
alter table public.vendors enable row level security;

-- Policies for vendors
create policy "Authenticated users can read vendors"
  on public.vendors for select
  using (auth.role() = 'authenticated');

create policy "Users can create their own vendors"
  on public.vendors for insert
  with check (created_by = auth.uid());

create policy "Users can update their own vendors"
  on public.vendors for update
  using (created_by = auth.uid());

create policy "Users can delete their own vendors"
  on public.vendors for delete
  using (created_by = auth.uid());

-- Indexes for performance
create index if not exists idx_vendors_category on public.vendors(category);

-- Attach trigger to increment submissions_count for creator
-- (Relies on existing function public.handle_vendor_insert())
create trigger trg_vendors_after_insert
after insert on public.vendors
for each row execute function public.handle_vendor_insert();
