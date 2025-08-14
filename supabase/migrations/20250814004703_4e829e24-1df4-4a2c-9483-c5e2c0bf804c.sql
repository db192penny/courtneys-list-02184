-- Add Google Places integration fields to vendors table
ALTER TABLE public.vendors 
ADD COLUMN google_place_id text,
ADD COLUMN google_last_updated timestamp with time zone,
ADD COLUMN google_reviews_json jsonb;

-- Update existing google rating columns to ensure they're properly typed
-- (they should already exist from the schema, but ensuring consistency)
ALTER TABLE public.vendors 
ALTER COLUMN google_rating TYPE numeric(3,2),
ALTER COLUMN google_rating_count TYPE integer;