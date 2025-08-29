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
  normalized_addr := public.normalize_address(NEW.address);
  
  -- REMOVE THE UPDATE STATEMENT - it causes infinite recursion
  -- The pending_invite_code will be handled by the users table creation trigger instead
  
  -- Existing community mapping logic (keep unchanged)
  IF NEW.signup_source IS NOT NULL AND NEW.signup_source LIKE 'community:%' THEN
    community_slug := split_part(NEW.signup_source, ':', 2);
    community_name := public.slug_to_community_name(community_slug);
    
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
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.household_hoa 
      WHERE normalized_address = normalized_addr
    ) THEN
      INSERT INTO public.household_hoa (
        household_address,
        normalized_address,
        hoa_name,
        created_by
      ) VALUES (
        NEW.address,
        normalized_addr,
        'Boca Bridges',
        NEW.id
      ) ON CONFLICT (normalized_address) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;