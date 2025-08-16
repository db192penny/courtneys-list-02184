-- Fix user address that was incorrectly changed
-- First, let's see the current state and fix it

-- Update the user's address back to the correct one
UPDATE public.users 
SET 
  address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  formatted_address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  street_name = public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA')
WHERE email = 'tbergamo28@gmail.com';

-- Log this correction in the address change log
INSERT INTO public.address_change_log (
  user_id,
  old_address,
  new_address,
  old_street_name,
  new_street_name,
  source,
  metadata
) 
SELECT 
  u.id,
  '21511 Rosella Rd, Boca Raton, FL 33496, USA' as old_address,
  '17443 Rosella Rd, Boca Raton, FL 33496, USA' as new_address,
  'rosella rd' as old_street_name,
  public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA') as new_street_name,
  'admin_correction' as source,
  jsonb_build_object(
    'reason', 'Restored correct address after incorrect change',
    'fixed_by', 'system_correction'
  ) as metadata
FROM public.users u 
WHERE u.email = 'tbergamo28@gmail.com';

-- Ensure the household_hoa mapping exists for the correct address
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name,
  created_by
) VALUES (
  '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA'),
  'Boca Bridges',
  (SELECT id FROM public.users WHERE email = 'tbergamo28@gmail.com')
) ON CONFLICT (normalized_address) DO NOTHING;