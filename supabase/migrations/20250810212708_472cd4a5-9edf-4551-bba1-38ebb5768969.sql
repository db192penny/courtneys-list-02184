
-- Add columns to store Google formatted address and place_id for users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS google_place_id text;
