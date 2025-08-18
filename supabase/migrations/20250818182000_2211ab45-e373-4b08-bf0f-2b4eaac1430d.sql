-- Add community information to invitations table
ALTER TABLE public.invitations 
ADD COLUMN community_slug text,
ADD COLUMN community_name text;

-- Drop the existing function and recreate with new return type
DROP FUNCTION public.validate_invite(text);

-- Create updated validate_invite function to return community information
CREATE OR REPLACE FUNCTION public.validate_invite(_token text)
RETURNS TABLE(invite_id uuid, invited_email text, status text, accepted boolean, created_at timestamp, community_slug text, community_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id, 
    i.invited_email, 
    i.status, 
    (i.accepted_at is not null) as accepted, 
    i.created_at,
    i.community_slug,
    i.community_name
  FROM public.invitations i
  WHERE i.invite_token = _token
  LIMIT 1;
$$;

-- Grant appropriate permissions
REVOKE ALL ON FUNCTION public.validate_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO anon, authenticated;