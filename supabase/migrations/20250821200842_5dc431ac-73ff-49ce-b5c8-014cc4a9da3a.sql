-- Fix the address mismatches found in the debug query
-- 1. Josh has "Wy" but I inserted "Way" 
-- 2. David's address (9616) is completely missing
-- 3. Helena has 9638 but I inserted 9610
-- 4. Need to check Frances

-- First, remove the incorrect entries I added
DELETE FROM public.household_hoa 
WHERE household_address IN (
  '17121 Brulee Breeze Way, Boca Raton, FL 33496, USA',  -- Wrong: should be "Wy"
  '9610 Macchiato Ave, Boca Raton, FL 33496, USA'        -- Wrong: should be 9638
);

-- Now insert the CORRECT addresses matching what users actually have
INSERT INTO public.household_hoa (
  household_address, 
  normalized_address, 
  hoa_name, 
  created_by
) VALUES 
-- Josh Dienstag's CORRECT address (with "Wy" not "Way")
(
  '17121 Brulee Breeze Wy, Boca Raton, FL 33496, USA',
  '17121 brulee breeze wy, boca raton, fl 33496, usa',
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'::uuid
),
-- David Ryba's address (was missing completely)
(
  '9616 Macchiato Ave, Boca Raton, FL 33496, USA',
  '9616 macchiato ave, boca raton, fl 33496, usa',
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'::uuid
),
-- Helena Braslavsky's CORRECT address (9638, not 9610)
(
  '9638 Macchiato Ave, Boca Raton, FL 33496, USA',
  '9638 macchiato ave, boca raton, fl 33496, usa',
  'Boca Bridges', 
  '00000000-0000-0000-0000-000000000000'::uuid
)
ON CONFLICT (normalized_address) DO NOTHING;