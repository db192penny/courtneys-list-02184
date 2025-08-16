-- Fix the orphaned user by creating the missing public.users record
INSERT INTO public.users (
  id,
  email,
  name,
  address,
  street_name,
  signup_source,
  is_verified,
  created_at
) VALUES (
  'c2bf9740-eca5-4913-a5a3-620fbc0214b0',
  'davebirnbaum@gmail.com',
  'Dave Birnbaum',
  '10123 Boca Woods Lane Boca Raton FL 33428',
  'Boca Woods Lane',
  'manual_fix',
  true,
  now()
) ON CONFLICT (id) DO NOTHING;

-- Award join points
UPDATE public.users 
SET points = COALESCE(points, 0) + 5
WHERE id = 'c2bf9740-eca5-4913-a5a3-620fbc0214b0';

-- Log to point history
INSERT INTO public.user_point_history (
  user_id, 
  activity_type, 
  points_earned, 
  description
) VALUES (
  'c2bf9740-eca5-4913-a5a3-620fbc0214b0',
  'join_site',
  5,
  'Retroactive points for joining (orphaned user fix)'
);