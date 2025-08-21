-- Update normalize_address() function to use full addresses (just lowercase + trim)
-- This implements Option 1: Keep Full Addresses approach

CREATE OR REPLACE FUNCTION public.normalize_address(_addr text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT lower(trim(coalesce(_addr, '')));
$function$;

-- Fix existing household_hoa data to use full addresses
-- First, remove the incorrect entries from the previous migration
DELETE FROM public.household_hoa 
WHERE household_address IN (
  '17121 Brulee Breeze Way, Boca Raton, FL 33496, USA',
  '9616 Macchiato Ave, Boca Raton, FL 33496, USA'
);

-- Now add the correct entries with full addresses in normalized_address field
INSERT INTO public.household_hoa (
  household_address, 
  normalized_address, 
  hoa_name, 
  created_by
) VALUES 
-- Josh Dienstag's address (full address normalization)
(
  '17121 Brulee Breeze Way, Boca Raton, FL 33496, USA',
  '17121 brulee breeze way, boca raton, fl 33496, usa',
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'::uuid
),
-- Frances Faccidomo's address (full address normalization)
(
  '9604 Macchiato Ave, Boca Raton, FL 33496, USA',
  '9604 macchiato ave, boca raton, fl 33496, usa', 
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'::uuid
),
-- Helena Braslavsky's address (full address normalization)  
(
  '9610 Macchiato Ave, Boca Raton, FL 33496, USA',
  '9610 macchiato ave, boca raton, fl 33496, usa',
  'Boca Bridges', 
  '00000000-0000-0000-0000-000000000000'::uuid
)
-- David Ryba already has correct mapping
ON CONFLICT (normalized_address) DO NOTHING;