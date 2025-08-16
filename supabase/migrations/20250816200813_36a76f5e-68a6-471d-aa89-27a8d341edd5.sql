-- Update list_vendor_reviews to handle "Unknown User" as invalid name
CREATE OR REPLACE FUNCTION public.list_vendor_reviews(_vendor_id uuid)
 RETURNS TABLE(id uuid, rating integer, recommended boolean, comments text, created_at timestamp without time zone, author_label text)
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
    r.recommended,
    r.comments,
    r.created_at,
    CASE
      WHEN coalesce(r.anonymous, false) OR NOT coalesce(u.show_name_public, false)
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
    END || CASE WHEN u.street_name IS NOT NULL AND length(trim(u.street_name)) > 0 THEN ' on ' || initcap(lower(trim(u.street_name))) ELSE '' END AS author_label
  FROM public.reviews r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.vendor_id = _vendor_id
  ORDER BY r.created_at DESC NULLS LAST;
END;
$function$