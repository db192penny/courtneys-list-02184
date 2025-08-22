-- Fix the remaining household_hoa records with slug format to use proper community name
UPDATE public.household_hoa 
SET hoa_name = 'Boca Bridges'
WHERE hoa_name = 'boca-bridges';

-- Update the auto_create_hoa_mapping trigger to use proper community names
CREATE OR REPLACE FUNCTION public.trg_auto_create_hoa_mapping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  community_slug text;
  community_name text;
  normalized_addr text;
BEGIN
  -- Only process users with community signup sources
  IF NEW.signup_source IS NOT NULL AND NEW.signup_source LIKE 'community:%' THEN
    -- Extract community slug from signup_source
    community_slug := split_part(NEW.signup_source, ':', 2);
    -- Convert slug to proper community name using the existing function
    community_name := public.slug_to_community_name(community_slug);
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
      community_name,  -- Use proper community name, not slug
      NEW.id
    ) ON CONFLICT (normalized_address) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;