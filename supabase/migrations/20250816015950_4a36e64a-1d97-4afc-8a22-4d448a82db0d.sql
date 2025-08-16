-- =============================================
-- COMPREHENSIVE SIGNUP FLOW FIX
-- =============================================

-- 1. Function to identify and fix orphaned users (in auth.users but not public.users)
CREATE OR REPLACE FUNCTION public.fix_orphaned_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  created_record boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_user record;
  user_exists boolean;
BEGIN
  -- Loop through auth.users that don't have corresponding public.users records
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL
      AND au.email_confirmed_at IS NOT NULL -- Only process confirmed users
  LOOP
    -- Check if user already exists (shouldn't happen but safety check)
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth_user.id) INTO user_exists;
    
    IF NOT user_exists THEN
      BEGIN
        -- Create the missing public.users record
        INSERT INTO public.users (
          id,
          email,
          name,
          address,
          street_name,
          signup_source,
          is_verified,
          created_at
        ) VALUES (
          auth_user.id,
          auth_user.email,
          COALESCE(auth_user.raw_user_meta_data->>'name', 'Unknown User'),
          COALESCE(auth_user.raw_user_meta_data->>'address', 'Address Not Provided'),
          COALESCE(auth_user.raw_user_meta_data->>'street_name', 'Unknown Street'),
          COALESCE(auth_user.raw_user_meta_data->>'signup_source', 'orphaned_fix'),
          true, -- Auto-verify since they completed auth
          auth_user.created_at
        );
        
        -- Award join points
        UPDATE public.users 
        SET points = COALESCE(points, 0) + 5
        WHERE id = auth_user.id;
        
        -- Log to point history
        INSERT INTO public.user_point_history (
          user_id, 
          activity_type, 
          points_earned, 
          description
        ) VALUES (
          auth_user.id,
          'join_site',
          5,
          'Retroactive points for joining (orphaned user fix)'
        );
        
        -- Return success
        user_id := auth_user.id;
        email := auth_user.email;
        created_record := true;
        error_message := null;
        RETURN NEXT;
        
      EXCEPTION WHEN OTHERS THEN
        -- Return error info
        user_id := auth_user.id;
        email := auth_user.email;
        created_record := false;
        error_message := SQLERRM;
        RETURN NEXT;
      END;
    END IF;
  END LOOP;
END;
$$;

-- 2. Function to manually fix a specific user (like davebirnbaum@gmail.com)
CREATE OR REPLACE FUNCTION public.fix_specific_orphaned_user(_email text, _name text DEFAULT NULL, _address text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  email text,
  created_record boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_user record;
  user_exists boolean;
  fixed_name text;
  fixed_address text;
BEGIN
  -- Find the auth user
  SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
  INTO auth_user
  FROM auth.users au
  WHERE lower(au.email) = lower(_email)
  LIMIT 1;
  
  IF auth_user.id IS NULL THEN
    user_id := null;
    email := _email;
    created_record := false;
    error_message := 'User not found in auth.users';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if user already exists in public.users
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth_user.id) INTO user_exists;
  
  IF user_exists THEN
    user_id := auth_user.id;
    email := auth_user.email;
    created_record := false;
    error_message := 'User already exists in public.users';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Determine name and address
  fixed_name := COALESCE(_name, auth_user.raw_user_meta_data->>'name', 'Unknown User');
  fixed_address := COALESCE(_address, auth_user.raw_user_meta_data->>'address', 'Address Not Provided');
  
  BEGIN
    -- Create the missing public.users record
    INSERT INTO public.users (
      id,
      email,
      name,
      address,
      street_name,
      signup_source,
      is_verified,
      created_at
    ) VALUES (
      auth_user.id,
      auth_user.email,
      fixed_name,
      fixed_address,
      public.normalize_address(fixed_address),
      'manual_fix',
      true, -- Auto-verify
      auth_user.created_at
    );
    
    -- Award join points
    UPDATE public.users 
    SET points = COALESCE(points, 0) + 5
    WHERE id = auth_user.id;
    
    -- Log to point history
    INSERT INTO public.user_point_history (
      user_id, 
      activity_type, 
      points_earned, 
      description
    ) VALUES (
      auth_user.id,
      'join_site',
      5,
      'Retroactive points for joining (manual fix)'
    );
    
    -- Return success
    user_id := auth_user.id;
    email := auth_user.email;
    created_record := true;
    error_message := null;
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    -- Return error info
    user_id := auth_user.id;
    email := auth_user.email;
    created_record := false;
    error_message := SQLERRM;
    RETURN NEXT;
  END;
END;
$$;

-- 3. Trigger to auto-create public.users records when auth.users are created
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create if email is confirmed and no existing record
  IF NEW.email_confirmed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    BEGIN
      INSERT INTO public.users (
        id,
        email,
        name,
        address,
        street_name,
        signup_source,
        is_verified,
        created_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'address', 'Address Pending'),
        COALESCE(NEW.raw_user_meta_data->>'street_name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'signup_source', 'auto_trigger'),
        true,
        NEW.created_at
      );
      
      -- Award join points
      UPDATE public.users 
      SET points = COALESCE(points, 0) + 5
      WHERE id = NEW.id;
      
      -- Log to point history
      INSERT INTO public.user_point_history (
        user_id, 
        activity_type, 
        points_earned, 
        description
      ) VALUES (
        NEW.id,
        'join_site',
        5,
        'Joined via auto-trigger'
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't block auth
      RAISE LOG 'Failed to auto-create public.users record for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_auth_user_created();

-- 4. Admin function to check for orphaned users
CREATE OR REPLACE FUNCTION public.check_orphaned_users()
RETURNS TABLE(
  auth_user_id uuid,
  auth_email text,
  auth_created_at timestamp with time zone,
  public_user_exists boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    au.created_at as auth_created_at,
    EXISTS(SELECT 1 FROM public.users pu WHERE pu.id = au.id) as public_user_exists
  FROM auth.users au
  WHERE au.email_confirmed_at IS NOT NULL
  ORDER BY au.created_at DESC;
$$;

-- 5. Fix the specific user mentioned (davebirnbaum@gmail.com)
SELECT * FROM public.fix_specific_orphaned_user('davebirnbaum@gmail.com');