-- Update David Birnbaum's address information
UPDATE public.users 
SET 
  address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  street_name = 'rosella rd'
WHERE email = 'db@fivefourventures.com';

-- Update auth.users metadata to prevent future overwrites
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'address', '17443 Rosella Rd, Boca Raton, FL 33496, USA',
    'street_name', 'rosella rd'
  )
WHERE email = 'db@fivefourventures.com';