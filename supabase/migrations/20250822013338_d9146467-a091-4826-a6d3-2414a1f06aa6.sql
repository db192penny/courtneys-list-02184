-- Fix existing broken household_hoa mappings where normalized_address is just a street name
-- This will find records where normalized_address doesn't contain numbers or commas (indicating it's just a street name)
-- and update them with properly normalized full addresses

-- First, let's see the broken mappings
DO $$
DECLARE
    broken_record RECORD;
    fixed_address TEXT;
BEGIN
    -- Loop through household_hoa records where normalized_address looks like just a street name
    FOR broken_record IN 
        SELECT hoa_name, household_address, normalized_address, created_by
        FROM public.household_hoa 
        WHERE normalized_address NOT LIKE '%,%' 
        AND normalized_address NOT SIMILAR TO '%[0-9]%'
        AND LENGTH(normalized_address) < 50
    LOOP
        -- Create the properly normalized address
        fixed_address := LOWER(TRIM(broken_record.household_address));
        
        -- Update the record with the correct normalized address
        UPDATE public.household_hoa 
        SET normalized_address = fixed_address,
            updated_at = NOW()
        WHERE hoa_name = broken_record.hoa_name 
        AND household_address = broken_record.household_address;
        
        RAISE NOTICE 'Fixed mapping for %: % -> %', 
            broken_record.household_address, 
            broken_record.normalized_address, 
            fixed_address;
    END LOOP;
END $$;