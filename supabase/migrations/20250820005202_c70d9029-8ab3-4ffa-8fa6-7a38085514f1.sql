-- Drop the old duplicate review trigger and function
DROP TRIGGER IF EXISTS trigger_review_points ON public.reviews;
DROP FUNCTION IF EXISTS public.trg_review_points();

-- Also drop any other old trigger names that might exist
DROP TRIGGER IF EXISTS trg_review_points_trigger ON public.reviews;
DROP TRIGGER IF EXISTS review_points_trigger ON public.reviews;

-- Run audit to fix all users with incorrect points
SELECT * FROM public.audit_and_fix_user_points();

-- Verify the remaining trigger is correct (should be trg_rate_vendor_points)
-- This query just shows what triggers remain on reviews table
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.reviews'::regclass;