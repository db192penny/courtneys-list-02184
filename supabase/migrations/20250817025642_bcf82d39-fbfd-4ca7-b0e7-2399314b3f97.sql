-- Fix security warning: add search_path to helper functions
CREATE OR REPLACE FUNCTION public.street_only(addr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.short_name(full_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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