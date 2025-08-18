-- Fix user name for db@fivefourventures.com
-- Update the users table to restore the correct name
UPDATE public.users 
SET name = 'David' 
WHERE id = '50c337c8-2c85-4aae-84da-26ee79f4c43b';

-- Update the auth.users metadata to prevent future overwrites
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"name": "David"}'::jsonb
WHERE id = '50c337c8-2c85-4aae-84da-26ee79f4c43b';