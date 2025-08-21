-- Add missing HOA mappings for Josh Dienstag and David Ryba
-- These users have reviews but their addresses aren't mapped to Boca Bridges

INSERT INTO public.household_hoa (
  household_address, 
  normalized_address, 
  hoa_name, 
  created_by
) VALUES 
-- Josh Dienstag's address
(
  '17121 Brulee Breeze Way, Boca Raton, FL 33496, USA',
  'brulee breeze way',
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'::uuid  -- System user
),
-- David Ryba's address  
(
  '9616 Macchiato Ave, Boca Raton, FL 33496, USA',
  'macchiato ave', 
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'::uuid  -- System user
);