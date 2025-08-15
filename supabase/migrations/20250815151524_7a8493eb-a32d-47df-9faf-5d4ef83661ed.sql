-- Add signup_source field to users table to track community-based signups
ALTER TABLE public.users 
ADD COLUMN signup_source text;

-- Create function for auto-verification based on signup source
CREATE OR REPLACE FUNCTION public.auto_verify_community_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-verify users who signed up via community links
  IF NEW.signup_source IS NOT NULL AND NEW.signup_source LIKE 'community:%' THEN
    NEW.is_verified := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-verification on user insert
CREATE TRIGGER auto_verify_community_users
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_verify_community_signup();