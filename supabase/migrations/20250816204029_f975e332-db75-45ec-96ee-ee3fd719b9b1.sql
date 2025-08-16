-- Fix user address that was incorrectly changed
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

-- Check if household_hoa mapping exists, if not create it
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name,
  created_by
) 
SELECT 
  '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA'),
  'Boca Bridges',
  u.id
FROM public.users u 
WHERE u.email = 'tbergamo28@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.household_hoa h 
  WHERE h.normalized_address = public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA')
);