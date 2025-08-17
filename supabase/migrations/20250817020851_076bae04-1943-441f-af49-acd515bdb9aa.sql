-- Update the list_vendor_reviews function to use cleaned street names
CREATE OR REPLACE FUNCTION public.list_vendor_reviews(_vendor_id uuid)
 RETURNS TABLE(id uuid, rating integer, comment text, user_id uuid, created_at timestamp with time zone, author_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Gate with existing approval status to match UI behavior
  IF NOT public.is_user_approved() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.rating,
    r.comment,
    r.user_id,
    r.created_at,
    CASE
      WHEN COALESCE(r.anonymous, false) OR NOT COALESCE(u.show_name_public, false)
        THEN 'Neighbor'
      ELSE 
        CASE 
          WHEN u.name IS NULL OR trim(u.name) = '' OR lower(trim(u.name)) = 'unknown user' THEN 'Neighbor'
          ELSE 
            CASE 
              WHEN position(' ' in trim(u.name)) > 0 THEN
                split_part(trim(u.name), ' ', 1) || ' ' || left(split_part(trim(u.name), ' ', -1), 1) || '.'
              ELSE trim(u.name)
            END
        END
    END || CASE 
      WHEN u.street_name IS NOT NULL AND length(trim(u.street_name)) > 0 THEN 
        -- Clean street name: remove house numbers and apartment markers
        ' on ' || initcap(lower(trim(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(trim(u.street_name), '\\s+', ' ', 'g'),
                '^\\s*\\d+[A-Za-z]?[\\s-]*', ''
              ),
              '\\s*(#|\\bapt\\b|\\bapartment\\b|\\bunit\\b)\\s*\\w+\\s*$', '', 'i'
            ),
            '\\s*\\d{5}(-\\d{4})?\\s*(,\\s*usa)?\\s*$',
            '', 'i'
          )
        )))
      ELSE '' 
    END AS author_label
  FROM public.reviews r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.vendor_id = _vendor_id
  ORDER BY r.created_at DESC NULLS LAST;
END;
$function$;

-- Update the list_vendor_costs function to use cleaned street names
CREATE OR REPLACE FUNCTION public.list_vendor_costs(_vendor_id uuid)
 RETURNS TABLE(id uuid, amount numeric, unit text, period text, cost_kind text, created_at timestamp with time zone, author_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Gate with existing approval status to match UI behavior
  IF NOT public.is_user_approved() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.amount,
    c.unit,
    c.period,
    c.cost_kind,
    c.created_at,
    CASE
      WHEN COALESCE(c.anonymous, false) OR NOT COALESCE(u.show_name_public, false)
        THEN 'Neighbor'
      ELSE 
        CASE 
          WHEN u.name IS NULL OR trim(u.name) = '' OR lower(trim(u.name)) = 'unknown user' THEN 'Neighbor'
          ELSE 
            CASE 
              WHEN position(' ' in trim(u.name)) > 0 THEN
                split_part(trim(u.name), ' ', 1) || ' ' || left(split_part(trim(u.name), ' ', -1), 1) || '.'
              ELSE trim(u.name)
            END
        END
    END || CASE 
      WHEN u.street_name IS NOT NULL AND length(trim(u.street_name)) > 0 THEN 
        -- Clean street name: remove house numbers and apartment markers
        ' on ' || initcap(lower(trim(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(trim(u.street_name), '\\s+', ' ', 'g'),
                '^\\s*\\d+[A-Za-z]?[\\s-]*', ''
              ),
              '\\s*(#|\\bapt\\b|\\bapartment\\b|\\bunit\\b)\\s*\\w+\\s*$', '', 'i'
            ),
            '\\s*\\d{5}(-\\d{4})?\\s*(,\\s*usa)?\\s*$',
            '', 'i'
          )
        )))
      ELSE '' 
    END AS author_label
  FROM public.costs c
  LEFT JOIN public.users u ON u.id = c.created_by
  WHERE c.vendor_id = _vendor_id
    AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC NULLS LAST;
END;
$function$;