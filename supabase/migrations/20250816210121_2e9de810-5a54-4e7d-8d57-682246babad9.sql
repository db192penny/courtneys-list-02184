-- Fix David Birnbaum account consolidation and address correction

-- Step 1: Delete the empty davebirnbaum@gmail.com account
DELETE FROM auth.users WHERE email = 'davebirnbaum@gmail.com';
DELETE FROM public.users WHERE email = 'davebirnbaum@gmail.com';

-- Step 2: Update db@fivefourventures.com address from 21511 to 17443 Rosella Rd
UPDATE public.users 
SET 
  address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  formatted_address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  street_name = public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA'),
  updated_at = now()
WHERE email = 'db@fivefourventures.com';

-- Step 3: Log the address correction
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
    'reason', 'Consolidated accounts and fixed address for db@fivefourventures.com',
    'fixed_by', 'account_consolidation'
  ) as metadata
FROM public.users u 
WHERE u.email = 'db@fivefourventures.com';

-- Step 4: Clean up any 21511 address references in household_hoa
DELETE FROM public.household_hoa 
WHERE household_address LIKE '%21511 Rosella Rd%';

-- Step 5: Ensure 17443 Rosella Rd is properly mapped to Boca Bridges HOA
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
WHERE u.email = 'db@fivefourventures.com'
AND NOT EXISTS (
  SELECT 1 FROM public.household_hoa h 
  WHERE h.normalized_address = public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA')
);

-- Step 6: Update any costs that were tied to the old address to the new normalized address
UPDATE public.costs 
SET normalized_address = public.normalize_address('17443 Rosella Rd, Boca Raton, FL 33496, USA'),
    household_address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
    updated_at = now()
WHERE normalized_address = public.normalize_address('21511 Rosella Rd, Boca Raton, FL 33496, USA');