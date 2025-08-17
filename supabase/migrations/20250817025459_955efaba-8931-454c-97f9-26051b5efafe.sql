-- 1) Create helper function to return just the street segment from a full address
CREATE OR REPLACE FUNCTION public.street_only(addr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    trim(                     -- clean outer whitespace
      regexp_replace(
        split_part(coalesce(addr,''), ',', 1),  -- take text before first comma
        '^\s*\d+\s+',                           -- drop leading house number
        ''
      )
    )
$$;

-- 2) Create helper function for "First L." formatting for names
CREATE OR REPLACE FUNCTION public.short_name(full_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH parts AS (
    SELECT regexp_split_to_array(trim(coalesce(full_name,'')), '\s+') AS a
  )
  SELECT CASE
    WHEN array_length(a,1) >= 2 THEN a[1] || ' ' || substr(a[array_length(a,1)],1,1) || '.'
    WHEN array_length(a,1) = 1 AND a[1] <> '' THEN a[1]
    ELSE NULL
  END
  FROM parts;
$$;

-- 3) Update list_vendor_reviews to use helper functions and return clean author_label
CREATE OR REPLACE FUNCTION public.list_vendor_reviews(_vendor_id uuid)
RETURNS TABLE(
  id uuid,
  rating integer,
  comments text,
  author_label text,
  created_at timestamp without time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow verified users to see reviews
  IF NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND COALESCE(u.is_verified, false) = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.rating,
    r.comments,
    CASE 
      WHEN r.anonymous = true THEN 'Neighbor on ' || public.street_only(u.address)
      ELSE coalesce(public.short_name(u.name), 'Neighbor') || ' on ' || public.street_only(u.address)
    END as author_label,
    r.created_at
  FROM public.reviews r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.vendor_id = _vendor_id
  ORDER BY r.created_at DESC;
END;
$function$;

-- 4) Update list_vendor_costs to use helper functions and return clean author_label
CREATE OR REPLACE FUNCTION public.list_vendor_costs(_vendor_id uuid)
RETURNS TABLE(
  id uuid,
  amount numeric,
  unit text,
  period text,
  cost_kind text,
  notes text,
  author_label text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow verified users to see costs
  IF NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND COALESCE(u.is_verified, false) = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.amount,
    c.unit,
    c.period,
    c.cost_kind,
    c.notes,
    CASE 
      WHEN c.anonymous = true THEN 'Neighbor on ' || public.street_only(u.address)
      ELSE coalesce(public.short_name(u.name), 'Neighbor') || ' on ' || public.street_only(u.address)
    END as author_label,
    c.created_at
  FROM public.costs c
  LEFT JOIN public.users u ON u.id = c.created_by
  WHERE c.vendor_id = _vendor_id 
    AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC;
END;
$function$;