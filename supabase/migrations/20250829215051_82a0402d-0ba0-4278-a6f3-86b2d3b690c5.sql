-- Fix invite_redemptions.points_awarded column type from BOOLEAN to INTEGER
-- First drop the default, change type, then set new default
ALTER TABLE public.invite_redemptions 
ALTER COLUMN points_awarded DROP DEFAULT;

ALTER TABLE public.invite_redemptions 
ALTER COLUMN points_awarded TYPE INTEGER USING CASE WHEN points_awarded THEN 10 ELSE 0 END;

ALTER TABLE public.invite_redemptions 
ALTER COLUMN points_awarded SET DEFAULT 0;