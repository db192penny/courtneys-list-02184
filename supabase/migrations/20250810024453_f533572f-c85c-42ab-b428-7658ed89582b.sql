
-- Ensure the trigger to auto-verify users and increment submission count
-- exists on vendor inserts. The function already exists in this project.

drop trigger if exists on_vendor_insert on public.vendors;

create trigger on_vendor_insert
after insert on public.vendors
for each row
execute function public.handle_vendor_insert();
