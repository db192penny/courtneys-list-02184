-- ============================================================================
-- PHASE 3: Backfill Function to Fix Missing HOA Mappings
-- ============================================================================

-- Create a simple function to manually fix the missing household_hoa entries
-- without the ambiguous column reference issues
DO $$
DECLARE
  user_rec record;
  norm_addr text;
  detected_community text;
  users_fixed integer := 0;
BEGIN
  -- Process each user who doesn't have a household_hoa entry
  FOR user_rec IN 
    SELECT u.id, u.email, u.address
    FROM public.users u
    LEFT JOIN public.household_hoa h ON h.normalized_address = public.normalize_address(u.address)
    WHERE h.normalized_address IS NULL
      AND u.address IS NOT NULL 
      AND u.address != 'Address Pending'
      AND u.address != 'Address Not Provided'
  LOOP
    -- Normalize the address
    norm_addr := public.normalize_address(user_rec.address);
    
    -- Detect community based on address content
    detected_community := CASE 
      WHEN lower(user_rec.address) LIKE '%boca bridges%' OR 
           lower(user_rec.address) LIKE '%33496%' OR
           lower(user_rec.address) LIKE '%boca raton%' THEN 'Boca Bridges'
      ELSE 'Unknown Community'
    END;
    
    -- Only create mapping if we can detect the community
    IF detected_community != 'Unknown Community' THEN
      -- Create the household_hoa entry using a different approach to avoid ambiguity
      INSERT INTO public.household_hoa 
        (household_address, normalized_address, hoa_name, created_by)
      SELECT 
        user_rec.address,
        norm_addr,
        detected_community,
        user_rec.id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.household_hoa 
        WHERE household_hoa.normalized_address = norm_addr
      );
      
      -- Also ensure the user's street_name is properly normalized
      UPDATE public.users 
      SET street_name = norm_addr
      WHERE id = user_rec.id AND street_name != norm_addr;
      
      users_fixed := users_fixed + 1;
      
      RAISE NOTICE 'Fixed user: % (%) -> %', user_rec.email, user_rec.address, detected_community;
    ELSE
      RAISE NOTICE 'Skipped user with unknown community: % (%)', user_rec.email, user_rec.address;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete. Fixed % users.', users_fixed;
END $$;