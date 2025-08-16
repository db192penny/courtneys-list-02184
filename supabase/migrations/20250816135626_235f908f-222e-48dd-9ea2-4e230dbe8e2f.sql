-- Update the default value for show_name_public to true
ALTER TABLE public.users 
ALTER COLUMN show_name_public SET DEFAULT true;

-- Update all existing users who have show_name_public = false to true
-- This ensures consistency for all existing users
UPDATE public.users 
SET show_name_public = true 
WHERE show_name_public = false OR show_name_public IS NULL;