-- Fix duplicate join points issue by removing redundant trigger and adding safety constraint

-- 1. Drop the redundant trigger that awards join points on users table insert
DROP TRIGGER IF EXISTS trg_award_join_points ON public.users;

-- 2. Drop the associated function since it's no longer needed
DROP FUNCTION IF EXISTS public.award_join_points();

-- 3. Clean up duplicate join_site entries first (keep the oldest one for each user)
WITH duplicate_joins AS (
  SELECT user_id, id, 
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
  FROM public.user_point_history 
  WHERE activity_type = 'join_site'
)
DELETE FROM public.user_point_history 
WHERE id IN (
  SELECT id FROM duplicate_joins WHERE rn > 1
);

-- 4. Add unique constraint specifically for join_site entries to prevent future duplicates
CREATE UNIQUE INDEX unique_join_site_per_user 
ON public.user_point_history (user_id) 
WHERE activity_type = 'join_site';