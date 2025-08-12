-- 1) Add contact_phone column to community_assets
ALTER TABLE public.community_assets
ADD COLUMN IF NOT EXISTS contact_phone text;