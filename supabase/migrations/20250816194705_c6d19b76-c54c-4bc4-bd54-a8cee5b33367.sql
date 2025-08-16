-- Fix db@fivefourventures.com address back to correct Boca Bridges address
UPDATE public.users 
SET 
  address = '17443 Rosella Rd, Boca Raton, FL 33487, USA',
  street_name = 'rosella rd',
  formatted_address = '17443 Rosella Rd, Boca Raton, FL 33487, USA'
WHERE email = 'db@fivefourventures.com';

-- Add logging table to track address changes
CREATE TABLE IF NOT EXISTS public.address_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  old_address TEXT,
  new_address TEXT,
  old_street_name TEXT,
  new_street_name TEXT,
  source TEXT, -- 'profile_page', 'signup', 'admin', etc.
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE public.address_change_log ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own address change log
CREATE POLICY "Users can read their own address changes" 
ON public.address_change_log 
FOR SELECT 
USING (user_id = auth.uid());

-- Policy to allow admins to read all address change logs
CREATE POLICY "Admins can read all address changes" 
ON public.address_change_log 
FOR SELECT 
USING (is_admin());

-- System can insert address change logs
CREATE POLICY "System can insert address change logs" 
ON public.address_change_log 
FOR INSERT 
WITH CHECK (true);