
-- Step 1: Fix the existing inconsistent HOA name data
UPDATE public.household_hoa 
SET hoa_name = 'Boca Bridges' 
WHERE hoa_name = 'boca-bridges';

-- Step 2: Run the corrected backfill function to fix any other inconsistencies
SELECT * FROM public.backfill_missing_hoa_mappings();

-- Step 3: Let's check if there's a unique constraint issue on home_vendors
-- First, let's see the table structure
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.home_vendors'::regclass;

-- Step 4: Let's also check what data we have in home_vendors vs reviews
-- This will help us understand the discrepancy
SELECT 
    'home_vendors' as table_name,
    COUNT(DISTINCT user_id) as distinct_users,
    COUNT(DISTINCT vendor_id) as distinct_vendors,
    COUNT(*) as total_records
FROM public.home_vendors
UNION ALL
SELECT 
    'reviews' as table_name,
    COUNT(DISTINCT user_id) as distinct_users,
    COUNT(DISTINCT vendor_id) as distinct_vendors,
    COUNT(*) as total_records
FROM public.reviews;
