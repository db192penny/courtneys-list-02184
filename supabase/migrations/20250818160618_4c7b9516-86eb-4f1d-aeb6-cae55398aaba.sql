-- Fix David Birnbaum's profile data issue
-- First let's see what's currently in the public.users table for debugging
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get current user data for debugging
    SELECT id, email, name, address, street_name 
    INTO user_record
    FROM public.users 
    WHERE email = 'db@fivefourventures.com';
    
    IF user_record.id IS NOT NULL THEN
        RAISE NOTICE 'Current user data - ID: %, Email: %, Name: %, Address: %, Street: %', 
            user_record.id, user_record.email, user_record.name, user_record.address, user_record.street_name;
    ELSE
        RAISE NOTICE 'No user found with email db@fivefourventures.com';
    END IF;
END $$;

-- Now forcefully update David's profile data
UPDATE public.users 
SET 
  name = 'David',
  address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  street_name = 'rosella rd',
  formatted_address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  updated_at = now()
WHERE email = 'db@fivefourventures.com';

-- Verify the update worked
DO $$
DECLARE
    user_record RECORD;
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % rows in public.users', update_count;
    
    -- Check the updated data
    SELECT id, email, name, address, street_name 
    INTO user_record
    FROM public.users 
    WHERE email = 'db@fivefourventures.com';
    
    IF user_record.id IS NOT NULL THEN
        RAISE NOTICE 'Updated user data - Name: %, Address: %, Street: %', 
            user_record.name, user_record.address, user_record.street_name;
    END IF;
END $$;