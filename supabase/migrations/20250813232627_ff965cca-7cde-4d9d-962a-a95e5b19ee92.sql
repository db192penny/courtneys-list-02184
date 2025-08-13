-- Update badge level names with new naming scheme
UPDATE public.badge_levels 
SET name = 'Contributor' 
WHERE name = 'Newcomer';

UPDATE public.badge_levels 
SET name = 'Patio Prodigy' 
WHERE name = 'Contributor';

UPDATE public.badge_levels 
SET name = 'Neighborhood Stud' 
WHERE name = 'Helper';

UPDATE public.badge_levels 
SET name = 'Champion' 
WHERE name = 'Expert';

UPDATE public.badge_levels 
SET name = '[Community Name] Boss' 
WHERE name = 'Champion';

UPDATE public.badge_levels 
SET name = '[Community Name] Legend' 
WHERE name = 'Legend';