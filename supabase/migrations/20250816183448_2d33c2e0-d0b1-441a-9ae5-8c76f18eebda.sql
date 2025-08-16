-- Fix duplicate join points issue by removing redundant trigger and adding safety constraint

-- 1. Drop the redundant trigger that awards join points on users table insert
DROP TRIGGER IF EXISTS trg_award_join_points ON public.users;

-- 2. Drop the associated function since it's no longer needed
DROP FUNCTION IF EXISTS public.award_join_points();

-- 3. Add unique constraint to prevent duplicate join_site entries per user
-- This ensures only one join_site entry can exist per user as a safety net
ALTER TABLE public.user_point_history 
ADD CONSTRAINT unique_join_site_per_user 
UNIQUE (user_id, activity_type) 
DEFERRABLE INITIALLY DEFERRED;