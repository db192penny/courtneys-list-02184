-- Only add the new fields that don't exist yet
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS google_last_updated timestamp with time zone,
ADD COLUMN IF NOT EXISTS google_reviews_json jsonb;