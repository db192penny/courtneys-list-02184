-- Backfill missing home_vendors entries for users who rated vendors 3+ stars
-- This fixes the bug where users who rated vendors highly didn't get them marked as "Your Provider"

INSERT INTO public.home_vendors (user_id, vendor_id, my_rating, created_at, updated_at)
SELECT DISTINCT
  r.user_id,
  r.vendor_id,
  r.rating as my_rating,
  r.created_at,
  now() as updated_at
FROM public.reviews r
WHERE r.rating >= 3
  AND NOT EXISTS (
    SELECT 1 FROM public.home_vendors hv 
    WHERE hv.user_id = r.user_id 
    AND hv.vendor_id = r.vendor_id
  )
  -- Only include users who still exist and are verified
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = r.user_id 
    AND COALESCE(u.is_verified, false) = true
  );