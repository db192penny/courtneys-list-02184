-- Add RLS policy for communities table
CREATE POLICY "Anyone can read communities" ON public.communities
FOR SELECT USING (true);