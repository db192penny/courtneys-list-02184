-- COMPLETE SOLUTION: Fix ZIP Code Matching Issues

-- Step 1: Immediate Fix - Update user's address to correct ZIP code
UPDATE public.users 
SET address = '21511 Rosella Rd, Boca Raton, FL 33496, USA',
    formatted_address = '21511 Rosella Rd, Boca Raton, FL 33496, USA',
    street_name = 'Rosella Rd',
    name = CASE 
      WHEN lower(trim(name)) = 'unknown user' THEN 'David Birnbaum'
      ELSE name 
    END,
    show_name_public = true
WHERE id = '50c337c8-2c85-4aae-84da-26ee79f4c43b';

-- Step 2: Create address mismatch logging table
CREATE TABLE IF NOT EXISTS public.address_mismatch_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  original_address text NOT NULL,
  normalized_address text NOT NULL,
  suggested_hoa text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid
);

-- Enable RLS on address mismatch log
ALTER TABLE public.address_mismatch_log ENABLE ROW LEVEL SECURITY;

-- Create policies for address mismatch log
CREATE POLICY "Admins can read address mismatch log" 
ON public.address_mismatch_log 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can insert address mismatch log" 
ON public.address_mismatch_log 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update address mismatch log" 
ON public.address_mismatch_log 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Step 3: Enhanced normalize_address function that strips ZIP codes for better matching
CREATE OR REPLACE FUNCTION public.normalize_address(_addr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  select lower(trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(_addr, ''), '\\s+', ' ', 'g'),
          '\\s*(#|\\bapt\\b|\\bapartment\\b|\\bunit\\b)\\s*\\w+\\s*$',
          '', 'i'
        ),
        '^\\s*\\d+[\\s-]*',
        ''
      ),
      '\\s*\\d{5}(-\\d{4})?\\s*(,\\s*usa)?\\s*$',
      '', 'i'
    )
  ));
$function$;

-- Step 4: Function to detect address mismatches and suggest HOA mappings
CREATE OR REPLACE FUNCTION public.detect_address_mismatch(_user_id uuid, _address text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_addr text;
  exact_hoa text;
  similar_hoa text;
BEGIN
  normalized_addr := public.normalize_address(_address);
  
  -- Check for exact match
  SELECT h.hoa_name INTO exact_hoa
  FROM public.household_hoa h
  WHERE h.normalized_address = normalized_addr
  LIMIT 1;
  
  IF exact_hoa IS NOT NULL THEN
    RETURN exact_hoa;
  END IF;
  
  -- Check for similar matches (fuzzy matching on street name)
  SELECT h.hoa_name INTO similar_hoa
  FROM public.household_hoa h
  WHERE similarity(h.normalized_address, normalized_addr) > 0.7
  ORDER BY similarity(h.normalized_address, normalized_addr) DESC
  LIMIT 1;
  
  -- Log the mismatch if no exact match found
  INSERT INTO public.address_mismatch_log (
    user_id, 
    original_address, 
    normalized_address, 
    suggested_hoa,
    status
  ) VALUES (
    _user_id,
    _address,
    normalized_addr,
    similar_hoa,
    CASE WHEN similar_hoa IS NOT NULL THEN 'suggestion_available' ELSE 'no_match' END
  ) ON CONFLICT DO NOTHING;
  
  RETURN similar_hoa;
END;
$function$;

-- Step 5: Admin function to fix address mismatches
CREATE OR REPLACE FUNCTION public.admin_fix_address_mismatch(_user_id uuid, _new_address text, _new_hoa text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_address text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Get old address for logging
  SELECT address INTO old_address FROM public.users WHERE id = _user_id;
  
  -- Update user address
  UPDATE public.users
  SET address = _new_address,
      formatted_address = _new_address,
      street_name = public.normalize_address(_new_address)
  WHERE id = _user_id;
  
  -- Update or insert HOA mapping
  INSERT INTO public.household_hoa (
    household_address,
    normalized_address,
    hoa_name,
    created_by
  ) VALUES (
    _new_address,
    public.normalize_address(_new_address),
    _new_hoa,
    auth.uid()
  ) ON CONFLICT (normalized_address) DO UPDATE SET
    hoa_name = _new_hoa,
    updated_at = now();
  
  -- Mark mismatch as resolved
  UPDATE public.address_mismatch_log
  SET status = 'resolved',
      resolved_at = now(),
      resolved_by = auth.uid()
  WHERE user_id = _user_id AND status = 'pending';
  
  -- Log the admin action
  INSERT INTO public.admin_audit_log (
    actor_id,
    action,
    target_id,
    metadata
  ) VALUES (
    auth.uid(),
    'fix_address_mismatch',
    _user_id,
    jsonb_build_object(
      'old_address', old_address,
      'new_address', _new_address,
      'hoa_name', _new_hoa
    )
  );
  
  RETURN true;
END;
$function$;

-- Step 6: Function to find all users with address mismatches
CREATE OR REPLACE FUNCTION public.admin_list_address_mismatches()
RETURNS TABLE(
  user_id uuid,
  email text,
  name text,
  address text,
  normalized_address text,
  suggested_hoa text,
  mismatch_status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
  SELECT DISTINCT ON (u.id)
    u.id as user_id,
    u.email,
    u.name,
    u.address,
    public.normalize_address(u.address) as normalized_address,
    aml.suggested_hoa,
    COALESCE(aml.status, 'no_hoa_mapping') as mismatch_status,
    COALESCE(aml.created_at, u.created_at::timestamp with time zone) as created_at
  FROM public.users u
  LEFT JOIN public.household_hoa hh ON hh.normalized_address = public.normalize_address(u.address)
  LEFT JOIN public.address_mismatch_log aml ON aml.user_id = u.id AND aml.status = 'pending'
  WHERE hh.hoa_name IS NULL  -- Users without HOA mapping
  ORDER BY u.id, aml.created_at DESC NULLS LAST;
END;
$function$;

-- Step 7: Update all existing normalized addresses with new function
UPDATE public.household_hoa 
SET normalized_address = public.normalize_address(household_address);

UPDATE public.costs 
SET normalized_address = public.normalize_address(household_address)
WHERE normalized_address IS NOT NULL;

UPDATE public.users 
SET street_name = public.normalize_address(address)
WHERE street_name IS NOT NULL;