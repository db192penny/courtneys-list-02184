-- Drop the existing function first, then recreate it without the problematic http_post_async call
DROP FUNCTION IF EXISTS public.mark_invite_accepted(text, uuid);

CREATE OR REPLACE FUNCTION public.mark_invite_accepted(_token text, _user_id uuid)
RETURNS TABLE(success boolean, points_awarded integer, inviter_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record record;
  inviter_record record;
  points_to_award integer := 10;
BEGIN
  -- Get the invitation record
  SELECT i.id, i.invited_by, i.status, i.invited_email 
  INTO invite_record
  FROM public.invitations i
  WHERE i.invite_token = _token
  LIMIT 1;

  -- Check if invitation exists and is still pending
  IF invite_record.id IS NULL THEN
    RETURN QUERY SELECT false, 0, null::text;
    RETURN;
  END IF;

  IF invite_record.status != 'pending' THEN
    RETURN QUERY SELECT false, 0, null::text;
    RETURN;
  END IF;

  -- Get inviter information
  SELECT u.email, u.name
  INTO inviter_record
  FROM public.users u
  WHERE u.id = invite_record.invited_by
  LIMIT 1;

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = invite_record.id;

  -- Update the new user's invited_by field
  UPDATE public.users
  SET invited_by = invite_record.invited_by
  WHERE id = _user_id;

  -- Award points to the inviter if they exist in our users table
  IF inviter_record.email IS NOT NULL THEN
    UPDATE public.users 
    SET points = COALESCE(points, 0) + points_to_award
    WHERE id = invite_record.invited_by;
    
    -- Log the points in user point history
    INSERT INTO public.user_point_history (
      user_id,
      activity_type,
      points_earned,
      description,
      related_id
    ) VALUES (
      invite_record.invited_by,
      'successful_invite',
      points_to_award,
      'Friend joined via invite: ' || invite_record.invited_email,
      invite_record.id
    );
  END IF;

  -- Return success information
  RETURN QUERY SELECT true, points_to_award, inviter_record.email;
END;
$function$;