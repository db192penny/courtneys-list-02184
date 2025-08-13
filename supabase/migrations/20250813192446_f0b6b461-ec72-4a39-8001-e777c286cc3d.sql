-- Update the list_vendor_reviews function to format names consistently as "First L."
CREATE OR REPLACE FUNCTION list_vendor_reviews(vendor_id_param uuid)
RETURNS TABLE (
  rating integer,
  author_label text,
  comments text,
  created_at timestamp without time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.rating,
    CASE 
      WHEN r.anonymous THEN 'Neighbor'::text
      ELSE 
        CASE 
          WHEN u.name IS NULL OR trim(u.name) = '' THEN 'Neighbor'::text
          ELSE 
            CASE 
              WHEN position(' ' in trim(u.name)) > 0 THEN
                split_part(trim(u.name), ' ', 1) || ' ' || left(split_part(trim(u.name), ' ', -1), 1) || '.'
              ELSE trim(u.name)
            END
        END
    END as author_label,
    r.comments,
    r.created_at
  FROM reviews r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE r.vendor_id = vendor_id_param
  ORDER BY r.created_at DESC;
END;
$$;