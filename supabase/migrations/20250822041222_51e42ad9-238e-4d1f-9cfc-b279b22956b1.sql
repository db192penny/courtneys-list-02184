-- Create function to convert slugs to proper community names
CREATE OR REPLACE FUNCTION public.slug_to_community_name(_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN _slug = 'boca-bridges' THEN 'Boca Bridges'
    WHEN _slug = 'palm-beach-gardens' THEN 'Palm Beach Gardens'
    WHEN _slug = 'wellington' THEN 'Wellington'
    ELSE 
      -- Generic conversion: replace hyphens with spaces and title case
      initcap(replace(_slug, '-', ' '))
  END;
$function$

-- Fix the backfill function to use proper community names
CREATE OR REPLACE FUNCTION public.backfill_missing_hoa_mappings()
RETURNS TABLE(user_id uuid, email text, fixed boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record record;
  community_slug text;
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
      -- Extract community slug from signup_source
      community_slug := split_part(user_record.signup_source, ':', 2);
      -- Convert slug to proper community name
      community_name := public.slug_to_community_name(community_slug);
      normalized_addr := public.normalize_address(user_record.address);
      
      -- Create the missing HOA mapping with proper name
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
$function$

-- Fix the trigger function to use proper community names
CREATE OR REPLACE FUNCTION public.trg_auto_create_hoa_mapping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  community_slug text;
  community_name text;
  normalized_addr text;
BEGIN
  -- Only process users with community signup sources
  IF NEW.signup_source IS NOT NULL AND NEW.signup_source LIKE 'community:%' THEN
    -- Extract community slug from signup_source
    community_slug := split_part(NEW.signup_source, ':', 2);
    -- Convert slug to proper community name
    community_name := public.slug_to_community_name(community_slug);
    normalized_addr := public.normalize_address(NEW.address);
    
    -- Create HOA mapping with proper name if it doesn't exist
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
$function$

-- Fix existing inconsistent data: update "boca-bridges" to "Boca Bridges"
UPDATE public.household_hoa 
SET hoa_name = 'Boca Bridges'
WHERE hoa_name = 'boca-bridges';

-- Fix any other slugified HOA names in the database
UPDATE public.household_hoa 
SET hoa_name = public.slug_to_community_name(hoa_name)
WHERE hoa_name ~ '^[a-z-]+$' AND hoa_name != public.slug_to_community_name(hoa_name);