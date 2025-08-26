-- Fix Kim Michos' email in auth.users to match public.users (resolve authentication loop)
UPDATE auth.users 
SET email = 'kjmichos@gmail.com', 
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb), 
      '{email}', 
      '"kjmichos@gmail.com"'
    )
WHERE id = 'a821d1af-37c5-4b61-a131-2b61a2f1b7e7'
AND email = 'kjmichos@gmail.con';