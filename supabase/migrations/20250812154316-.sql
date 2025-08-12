-- Create function to list vendor reviews with author labels respecting anonymity and legacy profile visibility
CREATE OR REPLACE FUNCTION public.list_vendor_reviews(_vendor_id uuid)
RETURNS TABLE(
  id uuid,
  rating integer,
  recommended boolean,
  comments text,
  created_at timestamp without time zone,
  author_label text
)
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
        THEN 'Neighbor' || CASE WHEN u.street_name IS NOT NULL AND length(trim(u.street_name)) > 0 THEN ' on ' || initcap(u.street_name) ELSE '' END
      ELSE coalesce(nullif(u.name, ''), 'Neighbor')
    END AS author_label
  FROM public.reviews r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.vendor_id = _vendor_id
  ORDER BY r.created_at DESC NULLS LAST;
END;
$function$;