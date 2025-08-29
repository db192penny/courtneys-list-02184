-- Fix invite_redemptions.points_awarded column type from BOOLEAN to INTEGER
ALTER TABLE public.invite_redemptions 
ALTER COLUMN points_awarded TYPE INTEGER USING CASE WHEN points_awarded THEN 10 ELSE 0 END;