-- Update badge level names to new naming scheme
UPDATE public.badge_levels 
SET name = 'Contributor' 
WHERE name = 'Patio Prodigy' AND min_points = 0;

UPDATE public.badge_levels 
SET name = 'Prodigy' 
WHERE name = 'Patio Prodigy' AND min_points = 25;

UPDATE public.badge_levels 
SET name = 'Neighborhood Boss' 
WHERE name = 'Neighborhood Stud' AND min_points = 75;

UPDATE public.badge_levels 
SET name = 'Champion' 
WHERE name = 'Boca Bridges Boss' AND min_points = 150;

UPDATE public.badge_levels 
SET name = 'Boca Bridges Champion' 
WHERE name = 'Boca Bridges Boss' AND min_points = 300;