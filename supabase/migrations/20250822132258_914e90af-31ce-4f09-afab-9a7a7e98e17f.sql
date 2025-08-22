-- Clean up duplicate RLS policies on users table
DROP POLICY IF EXISTS "Users can select own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Keep only the essential policies
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can still manage all users
CREATE POLICY "Admins can select all users" ON public.users
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update any user" ON public.users
FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Create automatic profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into public.users when a new auth.user is created
  INSERT INTO public.users (
    id,
    email,
    name,
    address,
    street_name,
    signup_source,
    is_verified,
    points,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data->>'address', 'Address Not Provided'),
    COALESCE(NEW.raw_user_meta_data->>'street_name', public.street_only(COALESCE(NEW.raw_user_meta_data->>'address', ''))),
    COALESCE(NEW.raw_user_meta_data->>'signup_source', 'auth_trigger'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'signup_source' LIKE 'community:%' 
        OR NEW.raw_user_meta_data->>'signup_source' LIKE 'homepage:%' 
      THEN true 
      ELSE false 
    END,
    5, -- Welcome bonus points
    NEW.created_at
  );
  
  -- Log welcome points to history
  INSERT INTO public.user_point_history (
    user_id, 
    activity_type, 
    points_earned, 
    description
  ) VALUES (
    NEW.id,
    'join_site',
    5,
    'Welcome bonus for joining the site'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to fire when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();