-- Update mark_invite_accepted to call edge function directly
CREATE OR REPLACE FUNCTION public.mark_invite_accepted(_token text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count integer;
  invite_record record;
  inviter_record record;
  new_user_record record;
  function_response record;
BEGIN
  -- Update invitation record
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      invited_by = COALESCE(invited_by, _user_id)
  WHERE invite_token = _token
    AND (accepted_at IS NULL OR status <> 'accepted')
  RETURNING * INTO invite_record;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- If invite was successfully marked as accepted
  IF updated_count > 0 AND invite_record.invited_by IS NOT NULL THEN
    -- Get inviter information
    SELECT u.*, h.hoa_name as community_name
    INTO inviter_record
    FROM public.users u
    LEFT JOIN public.household_hoa h ON h.normalized_address = public.normalize_address(u.address)
    WHERE u.id = invite_record.invited_by;
    
    -- Get new user information  
    SELECT * INTO new_user_record
    FROM public.users
    WHERE id = _user_id;
    
    -- Award 10 points to inviter
    UPDATE public.users 
    SET points = COALESCE(points, 0) + 10
    WHERE id = invite_record.invited_by;
    
    -- Log to point history
    INSERT INTO public.user_point_history (
      user_id, 
      activity_type, 
      points_earned, 
      description, 
      related_id
    ) VALUES (
      invite_record.invited_by,
      'invite_neighbor',
      10,
      'Successfully invited ' || COALESCE(new_user_record.name, 'a neighbor') || ' to join',
      _user_id
    );

    -- Update the invited_by field in the new user's record
    UPDATE public.users 
    SET invited_by = invite_record.invited_by
    WHERE id = _user_id;
    
    -- Send success email notification via edge function (non-blocking)
    BEGIN
      SELECT * INTO function_response 
      FROM public.http_post_async(
        'https://iuxacgyocpwblpmmbwwc.supabase.co/functions/v1/send-invite-success-email-listener',
        json_build_object(
          'inviter_id', invite_record.invited_by,
          'inviter_name', inviter_record.name,
          'inviter_email', inviter_record.email,
          'invited_name', new_user_record.name,
          'community_name', COALESCE(invite_record.community_name, inviter_record.community_name),
          'community_slug', invite_record.community_slug
        )::text,
        'application/json'::text
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the invite acceptance
      RAISE WARNING 'Failed to send invite success email: %', SQLERRM;
    END;
  END IF;
  
  RETURN updated_count > 0;
END;
$$;