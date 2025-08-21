-- Add Frances Faccidomo's CORRECT address 
-- She's on Chauvet Wy, not Macchiato Ave as I incorrectly assumed

INSERT INTO public.household_hoa (
  household_address, 
  normalized_address, 
  hoa_name, 
  created_by
) VALUES 
-- Frances Faccidomo's CORRECT address 
(
  '9015 Chauvet Wy, Boca Raton, FL 33496, USA',
  '9015 chauvet wy, boca raton, fl 33496, usa',
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'::uuid
)
ON CONFLICT (normalized_address) DO NOTHING;