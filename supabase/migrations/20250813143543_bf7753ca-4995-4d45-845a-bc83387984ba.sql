-- Add unique constraint to prevent duplicate vendors
ALTER TABLE public.vendors
ADD CONSTRAINT vendors_name_community_unique UNIQUE (name, community);

-- Create function to check for vendor duplicates
CREATE OR REPLACE FUNCTION public.check_vendor_duplicate(_name text, _community text)
RETURNS TABLE(vendor_id uuid, vendor_name text, vendor_category text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT v.id, v.name, v.category
  FROM public.vendors v
  WHERE lower(trim(v.name)) = lower(trim(_name))
    AND lower(trim(coalesce(v.community, ''))) = lower(trim(coalesce(_community, '')))
  LIMIT 1;
END;
$function$