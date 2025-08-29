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
  -- Check if invite code exists and is valid
  SELECT ic.id, ic.user_id, ic.points_awarded, ic.expires_at, ic.uses_count, ic.max_uses
  INTO invite_record
  FROM public.invite_codes ic
  WHERE ic.code = _code
  LIMIT 1;

  -- Return failure if invite doesn't exist
  IF invite_record.id IS NULL THEN
    RETURN QUERY SELECT false, 0, null::text, null::text, null::uuid;
    RETURN;
  END IF;

  -- Check if invite has expired
  IF invite_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 0, null::text, null::text, null::uuid;
    RETURN;
  END IF;

  -- Check if invite has reached max uses
  IF invite_record.uses_count >= invite_record.max_uses THEN
    RETURN QUERY SELECT false, 0, null::text, null::text, null::uuid;
    RETURN;
  END IF;

  -- Check if user has already redeemed this code
  IF EXISTS (
    SELECT 1 FROM public.invite_redemptions ir
    WHERE ir.invite_code = _code AND ir.invited_user_id = _invited_user_id
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

  -- Set points to award (use from invite or default to 10)
  points_to_award := COALESCE(invite_record.points_awarded, 10);

  -- Record the redemption with FIXED points_awarded value
  INSERT INTO public.invite_redemptions (
    invite_code,
    inviter_id,
    invited_user_id,
    points_awarded
  ) VALUES (
    _code,
    invite_record.user_id,
    _invited_user_id,
    points_to_award  -- FIXED: Use integer instead of boolean true
  );

  -- Update invite code usage count
  UPDATE public.invite_codes 
  SET uses_count = uses_count + 1
  WHERE id = invite_record.id;

  -- Award points to the inviter
  UPDATE public.users 
  SET points = COALESCE(points, 0) + points_to_award
  WHERE id = invite_record.user_id;

  -- Log the points in user point history for inviter
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
    _invited_user_id
  );

  -- Return success information
  RETURN QUERY SELECT true, points_to_award, inviter_record.name, inviter_record.email, invite_record.user_id;
END;
$function$