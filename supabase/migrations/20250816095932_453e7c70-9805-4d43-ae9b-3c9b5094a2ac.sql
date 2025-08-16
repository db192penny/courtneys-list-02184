-- Fix orphaned user davebirnbaum@gmail.com
INSERT INTO public.users (
  id,
  email,
  name,
  address,
  street_name,
  signup_source,
  is_verified,
  created_at,
  points
) VALUES (
  'c2bf9740-eca5-4913-a5a3-620fbc0214b0',
  'davebirnbaum@gmail.com',
  'Dave Birnbaum',
  'Address Pending',
  'Unknown',
  'orphaned_fix',
  true,
  '2025-08-10 02:11:14.480829+00',
  5
);

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