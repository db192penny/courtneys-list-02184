-- ============================================================================
-- PHASE 1: Enhanced Database Triggers for Automatic HOA Mapping
-- ============================================================================

-- First, let's enhance the existing handle_auth_user_created function
-- to automatically create household_hoa entries for ALL new users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_address text;
  norm_address text;
  detected_hoa text;
BEGIN
  -- Only create if email is confirmed and no existing record
  IF NEW.email_confirmed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    BEGIN
      -- Get address from metadata
      user_address := COALESCE(NEW.raw_user_meta_data->>'address', 'Address Pending');
      
      -- Normalize the address
      norm_address := public.normalize_address(user_address);
      
      -- Detect community based on address content
      detected_hoa := CASE 
        WHEN lower(user_address) LIKE '%boca bridges%' OR 
             lower(user_address) LIKE '%33496%' OR
             lower(user_address) LIKE '%boca raton%' THEN 'Boca Bridges'
        ELSE 'Unknown Community'
      END;

      -- Create the public.users record
      INSERT INTO public.users (
        id,
        email,
        name,
        address,
        street_name,
        signup_source,
        is_verified,
        created_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        user_address,
        norm_address,
        COALESCE(NEW.raw_user_meta_data->>'signup_source', 'auto_trigger'),
        true,
        NEW.created_at
      );
      
      -- Create the household_hoa record automatically
      -- Only if we have a valid address (not the default "Address Pending")
      IF user_address != 'Address Pending' AND detected_hoa != 'Unknown Community' THEN
        INSERT INTO public.household_hoa (
          household_address,
          normalized_address,
          hoa_name,
          created_by
        ) VALUES (
          user_address,
          norm_address,
          detected_hoa,
          NEW.id
        ) ON CONFLICT (household_hoa.normalized_address) DO UPDATE SET
          hoa_name = EXCLUDED.hoa_name,
          updated_at = now();
      END IF;
      
      -- Award join points
      UPDATE public.users 
      SET points = COALESCE(points, 0) + 5
      WHERE id = NEW.id;
      
      -- Log to point history
      INSERT INTO public.user_point_history (
        user_id, 
        activity_type, 
        points_earned, 
        description
      ) VALUES (
        NEW.id,
        'join_site',
        5,
        'Joined via enhanced auto-trigger'
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't block auth
      RAISE LOG 'Failed to auto-create records for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Create new trigger function for user address updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_address_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  norm_address text;
  detected_hoa text;
BEGIN
  -- Only proceed if the address actually changed
  IF OLD.address IS DISTINCT FROM NEW.address THEN
    -- Normalize the new address
    norm_address := public.normalize_address(NEW.address);
    
    -- Update the street_name field to match normalized address
    NEW.street_name := norm_address;
    
    -- Detect community based on address content
    detected_hoa := CASE 
      WHEN lower(NEW.address) LIKE '%boca bridges%' OR 
           lower(NEW.address) LIKE '%33496%' OR
           lower(NEW.address) LIKE '%boca raton%' THEN 'Boca Bridges'
      ELSE 'Unknown Community'
    END;
    
    -- Create or update household_hoa record
    -- Only if we have a valid address and can detect the community
    IF NEW.address IS NOT NULL AND NEW.address != 'Address Pending' AND detected_hoa != 'Unknown Community' THEN
      INSERT INTO public.household_hoa (
        household_address,
        normalized_address,
        hoa_name,
        created_by
      ) VALUES (
        NEW.address,
        norm_address,
        detected_hoa,
        NEW.id
      ) ON CONFLICT (household_hoa.normalized_address) DO UPDATE SET
        household_address = EXCLUDED.household_address,
        hoa_name = EXCLUDED.hoa_name,
        updated_at = now();
    END IF;
    
    -- Log the address change
    INSERT INTO public.address_change_log (
      user_id,
      old_address,
      new_address,
      old_street_name,
      new_street_name,
      source
    ) VALUES (
      NEW.id,
      OLD.address,
      NEW.address,
      OLD.street_name,
      NEW.street_name,
      'user_profile_update'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on users table for address updates
DROP TRIGGER IF EXISTS handle_user_address_update ON public.users;
CREATE TRIGGER handle_user_address_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_address_update();

-- ============================================================================
-- PHASE 3: Backfill Function to Fix Missing HOA Mappings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_missing_household_hoa()
RETURNS TABLE(
  user_id uuid,
  email text,
  address text,
  normalized_address text,
  hoa_mapped text,
  action_taken text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_record record;
  norm_address text;
  detected_hoa text;
BEGIN
  -- Find users who don't have corresponding household_hoa entries
  FOR user_record IN 
    SELECT u.id, u.email, u.address, u.street_name
    FROM public.users u
    LEFT JOIN public.household_hoa h ON h.normalized_address = public.normalize_address(u.address)
    WHERE h.normalized_address IS NULL
      AND u.address IS NOT NULL 
      AND u.address != 'Address Pending'
      AND u.address != 'Address Not Provided'
  LOOP
    -- Normalize the address
    norm_address := public.normalize_address(user_record.address);
    
    -- Detect community based on address content
    detected_hoa := CASE 
      WHEN lower(user_record.address) LIKE '%boca bridges%' OR 
           lower(user_record.address) LIKE '%33496%' OR
           lower(user_record.address) LIKE '%boca raton%' THEN 'Boca Bridges'
      ELSE 'Unknown Community'
    END;
    
    -- Only create mapping if we can detect a community
    IF detected_hoa != 'Unknown Community' THEN
      -- Create the household_hoa entry
      INSERT INTO public.household_hoa (
        household_address,
        normalized_address,
        hoa_name,
        created_by
      ) VALUES (
        user_record.address,
        norm_address,
        detected_hoa,
        user_record.id
      ) ON CONFLICT (household_hoa.normalized_address) DO UPDATE SET
        hoa_name = EXCLUDED.hoa_name,
        updated_at = now();
      
      -- Also ensure the user's street_name is properly normalized
      UPDATE public.users 
      SET street_name = norm_address
      WHERE id = user_record.id AND street_name != norm_address;
      
      -- Return the result
      user_id := user_record.id;
      email := user_record.email;
      address := user_record.address;
      normalized_address := norm_address;
      hoa_mapped := detected_hoa;
      action_taken := 'created_hoa_mapping';
      RETURN NEXT;
    ELSE
      -- Return info about skipped users
      user_id := user_record.id;
      email := user_record.email;
      address := user_record.address;
      normalized_address := norm_address;
      hoa_mapped := null;
      action_taken := 'skipped_unknown_community';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;