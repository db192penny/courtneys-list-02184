-- Create function to convert slugs to proper community names
CREATE OR REPLACE FUNCTION public.slug_to_community_name(_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _slug = 'boca-bridges' THEN 'Boca Bridges'
    WHEN _slug = 'palm-beach-gardens' THEN 'Palm Beach Gardens'
    WHEN _slug = 'wellington' THEN 'Wellington'
    ELSE 
      -- Generic conversion: replace hyphens with spaces and title case
      initcap(replace(_slug, '-', ' '))
  END;
$$;