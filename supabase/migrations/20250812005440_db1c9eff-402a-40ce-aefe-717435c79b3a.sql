-- Add updated_at column to users to satisfy triggers that set NEW.updated_at
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();