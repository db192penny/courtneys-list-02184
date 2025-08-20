-- Fix Adam Jacobs missing HOA mapping
INSERT INTO public.household_hoa (
  household_address,
  normalized_address, 
  hoa_name,
  created_by
) VALUES (
  '7101 haviland cir', 
  'haviland cir',
  'Boca Bridges',
  (SELECT id FROM public.users WHERE email = 'adamkjacobs86@gmail.com' LIMIT 1)
) ON CONFLICT (normalized_address) DO NOTHING;

-- Fix any other missing HOA mappings for Boca Bridges users
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name, 
  created_by
)
SELECT 
  u.address,
  u.street_name,
  'Boca Bridges',
  u.id
FROM public.users u
WHERE u.signup_source LIKE '%boca%'
  AND NOT EXISTS (
    SELECT 1 FROM public.household_hoa h 
    WHERE h.normalized_address = u.street_name
  )
  AND u.address IS NOT NULL
  AND u.address != 'Address Not Provided';

-- Also check for any users with boca in their address who might be missing HOA mapping
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name,
  created_by  
)
SELECT 
  u.address,
  u.street_name,
  'Boca Bridges',
  u.id
FROM public.users u
WHERE (LOWER(u.address) LIKE '%boca%' OR LOWER(u.address) LIKE '%33496%')
  AND NOT EXISTS (
    SELECT 1 FROM public.household_hoa h 
    WHERE h.normalized_address = u.street_name
  )
  AND u.address IS NOT NULL
  AND u.address != 'Address Not Provided';