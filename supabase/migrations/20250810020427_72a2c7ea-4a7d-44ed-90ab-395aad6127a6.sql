-- Harden helper function with fixed search_path
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;