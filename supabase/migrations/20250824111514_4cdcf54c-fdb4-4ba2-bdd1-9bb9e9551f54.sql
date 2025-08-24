-- Fix Lauren Smith's points to correct amount
UPDATE public.users 
SET points = 35
WHERE LOWER(name) LIKE '%lauren%' AND LOWER(name) LIKE '%smith%';

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
  35 - points,
  'Fixed incorrect points: Should be 35 points (5 join + 5 vendor + 15 reviews + 10 costs)'
FROM public.users 
WHERE LOWER(name) LIKE '%lauren%' AND LOWER(name) LIKE '%smith%';