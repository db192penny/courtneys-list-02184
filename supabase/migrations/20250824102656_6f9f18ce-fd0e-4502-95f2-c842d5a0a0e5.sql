-- Fix missing home_vendors entry for db@fivefourventures.com who rated Daniel Chadee 4 stars
INSERT INTO public.home_vendors (user_id, vendor_id, my_rating, created_at, updated_at)
SELECT 
  r.user_id,
  r.vendor_id,
  r.rating,
  r.created_at,
  now()
FROM public.reviews r
JOIN public.users u ON u.id = r.user_id
JOIN public.vendors v ON v.id = r.vendor_id
WHERE u.email = 'db@fivefourventures.com'
  AND r.rating >= 3
  AND (LOWER(v.name) LIKE '%daniel%' OR LOWER(v.name) LIKE '%chadee%')
  AND NOT EXISTS (
    SELECT 1 FROM public.home_vendors hv 
    WHERE hv.user_id = r.user_id 
    AND hv.vendor_id = r.vendor_id
  );