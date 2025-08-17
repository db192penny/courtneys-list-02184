-- Create list_vendor_reviews function
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
      WHEN r.anonymous = true THEN 'Anonymous Neighbor'
      WHEN u.show_name_public = true THEN 
        CASE 
          WHEN u.name IS NOT NULL AND trim(u.name) != '' THEN 
            split_part(trim(u.name), ' ', 1) || ' ' || 
            CASE 
              WHEN split_part(trim(u.name), ' ', 2) != '' THEN 
                left(split_part(trim(u.name), ' ', 2), 1) || '.'
              ELSE ''
            END
          ELSE 'Neighbor'
        END ||
        CASE 
          WHEN u.street_name IS NOT NULL AND trim(u.street_name) != '' THEN 
            ' on ' || initcap(trim(u.street_name))
          ELSE ''
        END
      ELSE 'Neighbor' ||
        CASE 
          WHEN u.street_name IS NOT NULL AND trim(u.street_name) != '' THEN 
            ' on ' || initcap(trim(u.street_name))
          ELSE ''
        END
    END as author_label,
    r.created_at
  FROM public.reviews r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.vendor_id = _vendor_id
  ORDER BY r.created_at DESC;
END;
$function$;

-- Create list_vendor_costs function
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
      WHEN c.anonymous = true THEN 'Anonymous Neighbor'
      WHEN u.show_name_public = true THEN 
        CASE 
          WHEN u.name IS NOT NULL AND trim(u.name) != '' THEN 
            split_part(trim(u.name), ' ', 1) || ' ' || 
            CASE 
              WHEN split_part(trim(u.name), ' ', 2) != '' THEN 
                left(split_part(trim(u.name), ' ', 2), 1) || '.'
              ELSE ''
            END
          ELSE 'Neighbor'
        END ||
        CASE 
          WHEN u.street_name IS NOT NULL AND trim(u.street_name) != '' THEN 
            ' on ' || initcap(trim(u.street_name))
          ELSE ''
        END
      ELSE 'Neighbor' ||
        CASE 
          WHEN u.street_name IS NOT NULL AND trim(u.street_name) != '' THEN 
            ' on ' || initcap(trim(u.street_name))
          ELSE ''
        END
    END as author_label,
    c.created_at
  FROM public.costs c
  LEFT JOIN public.users u ON u.id = c.created_by
  WHERE c.vendor_id = _vendor_id 
    AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC;
END;
$function$;