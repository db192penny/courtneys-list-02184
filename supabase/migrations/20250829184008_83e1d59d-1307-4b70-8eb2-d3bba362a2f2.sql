-- Update redeem_invite_code function to return inviter_id
CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text, _invited_user_id uuid)
RETURNS TABLE(success boolean, points_awarded integer, inviter_name text, inviter_email text, inviter_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_record record;
  inviter_record record;
  points_to_award integer;
BEGIN
  -- Get the invite code record
  SELECT ic.id, ic.user_id, ic.expires_at, ic.max_uses, ic.uses_count, ic.points_awarded 
  INTO invite_record
  FROM public.invite_codes ic
  WHERE ic.code = _code
  LIMIT 1;

  -- Check if invite code exists
  IF invite_record.id IS NULL THEN
    RETURN QUERY SELECT false, 0, null::text, null::text, null::uuid;
    RETURN;
  END IF;

  -- Check if invite is expired
  IF invite_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 0, null::text, null::text, null::uuid;
    RETURN;
  END IF;

  -- Check if invite has reached usage limit
  IF invite_record.uses_count >= invite_record.max_uses THEN
    RETURN QUERY SELECT false, 0, null::text, null::text, null::uuid;
    RETURN;
  END IF;

  -- Check if this user has already redeemed this invite
  IF EXISTS (
    SELECT 1 FROM public.invite_redemptions 
    WHERE invite_code = _code AND invited_user_id = _invited_user_id
  ) THEN
    RETURN QUERY SELECT false, 0, null::text, null::text, null::uuid;
    RETURN;
  END IF;

  -- Get inviter information
  SELECT u.name, u.email
  INTO inviter_record
  FROM public.users u
  WHERE u.id = invite_record.user_id
  LIMIT 1;

  points_to_award := COALESCE(invite_record.points_awarded, 10);

  -- Record the redemption
  INSERT INTO public.invite_redemptions (
    invite_code,
    inviter_id,
    invited_user_id,
    points_awarded
  ) VALUES (
    _code,
    invite_record.user_id,
    _invited_user_id,
    true
  );

  -- Increment the uses count on the invite code
  UPDATE public.invite_codes
  SET uses_count = uses_count + 1
  WHERE id = invite_record.id;

  -- Award points to the inviter
  IF inviter_record.name IS NOT NULL THEN
    UPDATE public.users 
    SET points = COALESCE(points, 0) + points_to_award
    WHERE id = invite_record.user_id;
    
    -- Log the points in user point history
    INSERT INTO public.user_point_history (
      user_id,
      activity_type,
      points_earned,
      description,
      related_id
    ) VALUES (
      invite_record.user_id,
      'successful_invite',
      points_to_award,
      'Friend joined via invite code: ' || _code,
      invite_record.id
    );
  END IF;

  -- Return success information including inviter_id
  RETURN QUERY SELECT true, points_to_award, inviter_record.name, inviter_record.email, invite_record.user_id;
END;
$function$