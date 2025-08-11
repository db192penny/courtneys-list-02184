-- 1) Create app_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin');
  END IF;
END
$$;

-- 2) user_roles table for role assignments
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

-- 4) Policies for user_roles (only admins can view/manage roles)
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5) Admin policies on users table
DROP POLICY IF EXISTS "Admins can select all users" ON public.users;
CREATE POLICY "Admins can select all users"
ON public.users
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
ON public.users
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6) Expanded vendor management policies for admins and HOA admins
DROP POLICY IF EXISTS "Admins can update vendors" ON public.vendors;
CREATE POLICY "Admins can update vendors"
ON public.vendors
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete vendors" ON public.vendors;
CREATE POLICY "Admins can delete vendors"
ON public.vendors
FOR DELETE
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "HOA admins can update vendors in their HOA" ON public.vendors;
CREATE POLICY "HOA admins can update vendors in their HOA"
ON public.vendors
FOR UPDATE
TO authenticated
USING (
  public.is_user_hoa_admin() AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g
    WHERE lower(g.hoa_name) = lower(vendors.community)
  )
)
WITH CHECK (
  public.is_user_hoa_admin() AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g
    WHERE lower(g.hoa_name) = lower(vendors.community)
  )
);

DROP POLICY IF EXISTS "HOA admins can delete vendors in their HOA" ON public.vendors;
CREATE POLICY "HOA admins can delete vendors in their HOA"
ON public.vendors
FOR DELETE
TO authenticated
USING (
  public.is_user_hoa_admin() AND EXISTS (
    SELECT 1 FROM public.get_my_hoa() g
    WHERE lower(g.hoa_name) = lower(vendors.community)
  )
);

-- 7) Admin RPCs for pending users and verification toggling
CREATE OR REPLACE FUNCTION public.admin_list_pending_users()
RETURNS TABLE(id uuid, email text, name text, is_verified boolean, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, u.name, u.is_verified, u.created_at
  FROM public.users u
  WHERE COALESCE(u.is_verified, false) = false
  ORDER BY u.created_at ASC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_verification(_user_id uuid, _is_verified boolean)
RETURNS TABLE(id uuid, is_verified boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.users
  SET is_verified = _is_verified
  WHERE id = _user_id;

  RETURN QUERY
  SELECT u.id, u.is_verified FROM public.users u WHERE u.id = _user_id;
END;
$$;

-- 8) Useful index for community-scoped vendor queries
CREATE INDEX IF NOT EXISTS idx_vendors_community_lower ON public.vendors ((lower(community)));

-- 9) Seed initial admin role for founder email (no-op if user not yet signed up)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('db@fivefourventures.com')
ON CONFLICT (user_id, role) DO NOTHING;