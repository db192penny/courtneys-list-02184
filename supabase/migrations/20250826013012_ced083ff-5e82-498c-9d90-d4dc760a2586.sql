-- Fix Kim Michos' email address typo
UPDATE users 
SET email = 'kjmichos@gmail.com' 
WHERE id = 'a821d1af-37c5-4b61-a131-2b61a2f1b7e7' 
AND email = 'kjmichos@gmail.con';