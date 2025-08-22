-- Fix RLS Policies for household_hoa table
-- Add INSERT policy allowing users to create mappings for their own addresses during signup
CREATE POLICY "Users can create their own household HOA mapping" 
ON public.household_hoa 
FOR INSERT 
WITH CHECK (true); -- Allow during signup process

-- Add UPDATE policy for admin operations
CREATE POLICY "Admins can update HOA mappings" 
ON public.household_hoa 
FOR UPDATE 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Create backfill function to fix existing missing HOA mappings
CREATE OR REPLACE FUNCTION public.backfill_missing_hoa_mappings()
RETURNS TABLE(user_id uuid, email text, fixed boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record record;
  community_name text;
  normalized_addr text;
BEGIN
  -- Find users with community signup sources who are missing HOA mappings
  FOR user_record IN 
    SELECT u.id, u.email, u.address, u.signup_source
    FROM public.users u
    LEFT JOIN public.household_hoa hh ON hh.normalized_address = public.normalize_address(u.address)
    WHERE u.signup_source LIKE 'community:%'
      AND hh.normalized_address IS NULL
  LOOP
    BEGIN
      -- Extract community name from signup_source
      community_name := split_part(user_record.signup_source, ':', 2);
      normalized_addr := public.normalize_address(user_record.address);
      
      -- Create the missing HOA mapping
      INSERT INTO public.household_hoa (
        household_address,
        normalized_address,
        hoa_name,
        created_by
      ) VALUES (
        user_record.address,
        normalized_addr,
        community_name,
        user_record.id
      ) ON CONFLICT (normalized_address) DO NOTHING;
      
      -- Return success
      user_id := user_record.id;
      email := user_record.email;
      fixed := true;
      error_message := null;
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Return error info
      user_id := user_record.id;
      email := user_record.email;
      fixed := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$function$;

-- Create trigger function for automatic HOA mapping
CREATE OR REPLACE FUNCTION public.trg_auto_create_hoa_mapping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  community_name text;
  normalized_addr text;
BEGIN
  -- Only process users with community signup sources
  IF NEW.signup_source IS NOT NULL AND NEW.signup_source LIKE 'community:%' THEN
    -- Extract community name from signup_source
    community_name := split_part(NEW.signup_source, ':', 2);
    normalized_addr := public.normalize_address(NEW.address);
    
    -- Create HOA mapping if it doesn't exist
    INSERT INTO public.household_hoa (
      household_address,
      normalized_address,
      hoa_name,
      created_by
    ) VALUES (
      NEW.address,
      normalized_addr,
      community_name,
      NEW.id
    ) ON CONFLICT (normalized_address) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic HOA mapping on user insert/update
DROP TRIGGER IF EXISTS trg_auto_hoa_mapping ON public.users;
CREATE TRIGGER trg_auto_hoa_mapping
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_create_hoa_mapping();

-- Create monitoring function to detect mapping failures
CREATE OR REPLACE FUNCTION public.admin_check_missing_hoa_mappings()
RETURNS TABLE(user_id uuid, email text, address text, signup_source text, missing_mapping boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.address,
    u.signup_source,
    (hh.normalized_address IS NULL) as missing_mapping
  FROM public.users u
  LEFT JOIN public.household_hoa hh ON hh.normalized_address = public.normalize_address(u.address)
  WHERE u.signup_source LIKE 'community:%'
  ORDER BY u.created_at DESC;
END;
$function$;