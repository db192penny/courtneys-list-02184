-- Create the missing user profile for davebirnbaum@gmail.com manually
INSERT INTO public.users (
  id,
  email,
  name,
  address,
  street_name,
  signup_source,
  is_verified,
  points,
  created_at
) VALUES (
  'da136de9-18a5-40d0-a65c-e8e6f0ba7bdb',
  'davebirnbaum@gmail.com',
  'Dave Birnbaum',
  '1234 Test Street, Boca Raton, FL 33433',
  'Test Street',
  'manual_fix',
  true,
  5,
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  street_name = EXCLUDED.street_name,
  is_verified = EXCLUDED.is_verified,
  points = EXCLUDED.points;