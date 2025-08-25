-- Update the auto-create HOA mapping trigger to default to Boca Bridges
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
  
  -- First, try community-specific mapping for users with community signup sources
  IF NEW.signup_source IS NOT NULL AND NEW.signup_source LIKE 'community:%' THEN
    -- Extract community slug from signup_source
    community_slug := split_part(NEW.signup_source, ':', 2);
    -- Convert slug to proper community name using the existing function
    community_name := public.slug_to_community_name(community_slug);
    
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
  ELSE
    -- For all other users, check if they already have an HOA mapping
    -- If not, default them to "Boca Bridges"
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
        'Boca Bridges',  -- Default fallback community
        NEW.id
      ) ON CONFLICT (normalized_address) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also run a one-time update to map any existing unmapped users to Boca Bridges
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name,
  created_by
)
SELECT DISTINCT
  u.address,
  public.normalize_address(u.address),
  'Boca Bridges',
  u.id
FROM public.users u
LEFT JOIN public.household_hoa hh ON hh.normalized_address = public.normalize_address(u.address)
WHERE hh.normalized_address IS NULL
  AND u.address IS NOT NULL
  AND trim(u.address) != ''
ON CONFLICT (normalized_address) DO NOTHING;