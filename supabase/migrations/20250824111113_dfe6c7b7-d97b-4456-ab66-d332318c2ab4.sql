-- Fix Angela's points correctly
UPDATE public.users 
SET points = 50
WHERE LOWER(name) LIKE '%angela%' AND LOWER(name) LIKE '%spock%';

-- Add correction entry
INSERT INTO public.user_point_history (
  user_id,
  activity_type,
  points_earned,
  description
) 
SELECT 
  id,
  'system_correction',
  50 - points,
  'Final correction: Should be 50 points (5 join + 10 vendors + 20 reviews + 15 costs)'
FROM public.users 
WHERE LOWER(name) LIKE '%angela%' AND LOWER(name) LIKE '%spock%';