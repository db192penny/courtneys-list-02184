-- Drop all triggers that depend on the function first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Drop the function with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS public.handle_auth_user_created() CASCADE;

-- Update Sanjeev's user record
UPDATE public.users 
SET 
  name = 'Sanjeev Mago',
  address = '17346 Santaluce Mnr, Boca Raton, FL 33496, USA',
  formatted_address = '17346 Santaluce Mnr, Boca Raton, FL 33496, USA',
  street_name = public.normalize_address('17346 Santaluce Mnr, Boca Raton, FL 33496, USA'),
  signup_source = 'community:Boca Bridges',
  updated_at = now()
WHERE email = 'smago3@yahoo.com';

-- Update Alan's user record
UPDATE public.users 
SET 
  name = 'Alan Damashek',
  address = '9956 Espresso Mnr, Boca Raton, FL 33496, USA',
  formatted_address = '9956 Espresso Mnr, Boca Raton, FL 33496, USA',
  street_name = public.normalize_address('9956 Espresso Mnr, Boca Raton, FL 33496, USA'),
  signup_source = 'community:Boca Bridges',
  updated_at = now()
WHERE email = 'alan.damashek@gmail.com';

-- Ensure proper HOA mappings exist for both addresses
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name,
  created_by
) VALUES 
(
  '17346 Santaluce Mnr, Boca Raton, FL 33496, USA',
  public.normalize_address('17346 Santaluce Mnr, Boca Raton, FL 33496, USA'),
  'Boca Bridges',
  (SELECT id FROM public.users WHERE email = 'smago3@yahoo.com' LIMIT 1)
),
(
  '9956 Espresso Mnr, Boca Raton, FL 33496, USA',
  public.normalize_address('9956 Espresso Mnr, Boca Raton, FL 33496, USA'),
  'Boca Bridges',
  (SELECT id FROM public.users WHERE email = 'alan.damashek@gmail.com' LIMIT 1)
)
ON CONFLICT (normalized_address) DO UPDATE SET
  hoa_name = EXCLUDED.hoa_name,
  updated_at = now();