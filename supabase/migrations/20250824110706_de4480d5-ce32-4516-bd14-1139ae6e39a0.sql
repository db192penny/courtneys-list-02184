-- Fix Angela Spock's points and audit all users
-- First, let's see what her actual points should be
UPDATE public.users 
SET points = (
  5 + -- join bonus
  (SELECT COUNT(*) * 5 FROM public.vendors WHERE created_by = users.id) +
  (SELECT COUNT(*) * 5 FROM public.reviews WHERE user_id = users.id) +
  (SELECT COUNT(*) * 5 FROM public.costs WHERE created_by = users.id)
)
WHERE LOWER(name) LIKE '%angela%' AND LOWER(name) LIKE '%spock%';

-- Add correction entry to point history for Angela
INSERT INTO public.user_point_history (
  user_id,
  activity_type,
  points_earned,
  description
) 
SELECT 
  id,
  'system_correction',
  (5 + 
   (SELECT COUNT(*) * 5 FROM public.vendors WHERE created_by = users.id) +
   (SELECT COUNT(*) * 5 FROM public.reviews WHERE user_id = users.id) +
   (SELECT COUNT(*) * 5 FROM public.costs WHERE created_by = users.id)
  ) - points,
  'Fixed point calculation bug - corrected from ' || points || ' to actual earned points'
FROM public.users 
WHERE LOWER(name) LIKE '%angela%' AND LOWER(name) LIKE '%spock%';