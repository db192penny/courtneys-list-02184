-- Fix the user data: Update "Unknown User" to have proper name if it should be David Birnbaum
UPDATE public.users 
SET name = 'David Birnbaum', 
    street_name = 'Rosella Rd',
    show_name_public = true
WHERE id = '50c337c8-2c85-4aae-84da-26ee79f4c43b' 
  AND lower(trim(name)) = 'unknown user';