-- Add pending_invite_code column to users table
ALTER TABLE public.users ADD COLUMN pending_invite_code TEXT;

-- Create index for performance on pending invite lookups
CREATE INDEX idx_users_pending_invite_code ON public.users(pending_invite_code) 
WHERE pending_invite_code IS NOT NULL;

-- Update user creation trigger to extract invite codes from auth metadata
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
  
  -- Extract pending invite code from auth metadata if present
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    UPDATE public.users 
    SET pending_invite_code = (
      SELECT raw_user_meta_data->>'pending_invite_code' 
      FROM auth.users 
      WHERE id = NEW.id
    )
    WHERE id = NEW.id 
    AND pending_invite_code IS NULL;
  END IF;
  
  -- Existing community mapping logic remains unchanged
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