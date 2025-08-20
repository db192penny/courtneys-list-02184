-- First, let's fix the existing household_hoa entries that have wrong normalized_address format
-- Update all household_hoa entries to use proper street-only normalization
UPDATE public.household_hoa 
SET normalized_address = public.normalize_address(household_address)
WHERE normalized_address != public.normalize_address(household_address);

-- Now add Adam Jacobs HOA mapping safely
INSERT INTO public.household_hoa (
  household_address,
  normalized_address, 
  hoa_name,
  created_by
) 
SELECT 
  u.address,
  public.normalize_address(u.address),
  'Boca Bridges',
  u.id
FROM public.users u
WHERE u.email = 'adamkjacobs86@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.household_hoa h 
    WHERE h.normalized_address = public.normalize_address(u.address)
  )
LIMIT 1;

-- Add any other missing Boca Bridges mappings
INSERT INTO public.household_hoa (
  household_address,
  normalized_address, 
  hoa_name,
  created_by
)
SELECT DISTINCT ON (public.normalize_address(u.address))
  u.address,
  public.normalize_address(u.address),
  'Boca Bridges',
  u.id
FROM public.users u
WHERE (u.signup_source LIKE '%boca%' OR 
       LOWER(u.address) LIKE '%boca%' OR 
       LOWER(u.address) LIKE '%33496%')
  AND u.address IS NOT NULL
  AND u.address != 'Address Not Provided'
  AND NOT EXISTS (
    SELECT 1 FROM public.household_hoa h 
    WHERE h.normalized_address = public.normalize_address(u.address)
  );