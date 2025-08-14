-- First, clean up existing duplicate cost entries
-- Keep only the most recent entry per user per vendor per cost_kind
WITH ranked_costs AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY created_by, vendor_id, COALESCE(cost_kind, 'one_time') 
      ORDER BY created_at DESC
    ) as rn
  FROM public.costs
),
duplicates_to_delete AS (
  SELECT id FROM ranked_costs WHERE rn > 1
)
DELETE FROM public.costs 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Add unique constraint to prevent future duplicates
-- Using created_by, vendor_id, and cost_kind (with default for nulls)
ALTER TABLE public.costs 
ADD CONSTRAINT unique_user_vendor_cost_kind 
UNIQUE (created_by, vendor_id, COALESCE(cost_kind, 'one_time'));