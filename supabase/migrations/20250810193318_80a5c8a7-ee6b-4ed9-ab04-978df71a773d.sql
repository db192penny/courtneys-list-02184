-- 1) Address normalization function
CREATE OR REPLACE FUNCTION public.normalize_address(_addr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  select lower(trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(_addr, ''), '\\s+', ' ', 'g'),
        '\\s*(#|\\bapt\\b|\\bapartment\\b|\\bunit\\b)\\s*\\w+\\s*$',
        '', 'i'
      ),
      '^\\s*\\d+[\\s-]*',
      ''
    )
  ));
$$;

-- 2) Helper to get current user's normalized address
CREATE OR REPLACE FUNCTION public.current_user_normalized_address()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select public.normalize_address((select u.address from public.users u where u.id = auth.uid()));
$$;

-- 3) household_hoa table
CREATE TABLE IF NOT EXISTS public.household_hoa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_address text NOT NULL,
  normalized_address text NOT NULL,
  hoa_name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.household_hoa ENABLE ROW LEVEL SECURITY;

-- Trigger to maintain normalized_address and updated_at
CREATE OR REPLACE FUNCTION public.trg_set_household_hoa_normalized()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.normalized_address := public.normalize_address(NEW.household_address);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_household_hoa_normalized ON public.household_hoa;
CREATE TRIGGER trg_household_hoa_normalized
BEFORE INSERT OR UPDATE ON public.household_hoa
FOR EACH ROW EXECUTE FUNCTION public.trg_set_household_hoa_normalized();

-- RLS: Only allow viewing the row that matches the current user's normalized address
DROP POLICY IF EXISTS "View own HOA mapping" ON public.household_hoa;
CREATE POLICY "View own HOA mapping"
ON public.household_hoa
FOR SELECT
USING (normalized_address = public.current_user_normalized_address());

-- 4) costs table
CREATE TABLE IF NOT EXISTS public.costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  household_address text NOT NULL,
  normalized_address text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3 AND currency = upper(currency)),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;

-- Trigger to maintain normalized_address, uppercase currency, and updated_at
CREATE OR REPLACE FUNCTION public.trg_set_costs_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.normalized_address := public.normalize_address(NEW.household_address);
  NEW.currency := upper(coalesce(NEW.currency, 'USD'));
  NEW.amount := round(NEW.amount::numeric, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_costs_fields ON public.costs;
CREATE TRIGGER trg_costs_fields
BEFORE INSERT OR UPDATE ON public.costs
FOR EACH ROW EXECUTE FUNCTION public.trg_set_costs_fields();

-- RLS for costs: Only access rows matching current user's household
DROP POLICY IF EXISTS "Read own household costs" ON public.costs;
CREATE POLICY "Read own household costs"
ON public.costs
FOR SELECT
USING (normalized_address = public.current_user_normalized_address());

DROP POLICY IF EXISTS "Insert own household costs" ON public.costs;
CREATE POLICY "Insert own household costs"
ON public.costs
FOR INSERT
WITH CHECK (normalized_address = public.current_user_normalized_address());

DROP POLICY IF EXISTS "Update own household costs" ON public.costs;
CREATE POLICY "Update own household costs"
ON public.costs
FOR UPDATE
USING (normalized_address = public.current_user_normalized_address())
WITH CHECK (normalized_address = public.current_user_normalized_address());

DROP POLICY IF EXISTS "Delete own household costs" ON public.costs;
CREATE POLICY "Delete own household costs"
ON public.costs
FOR DELETE
USING (normalized_address = public.current_user_normalized_address());

-- 5) Vendors updated_at column and trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN updated_at timestamptz;
  END IF;
END$$;

DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Invitations: make invited_email nullable and unique invite_token
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'invited_email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN invited_email DROP NOT NULL;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_invite_token_idx ON public.invitations(invite_token);

-- Allow users to insert their own invites
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create their invites" ON public.invitations;
CREATE POLICY "Users can create their invites"
ON public.invitations
FOR INSERT
WITH CHECK (invited_by = auth.uid());

-- 7) Stats function (vendor_cost_stats)
CREATE OR REPLACE FUNCTION public.vendor_cost_stats(_vendor_id uuid, _hoa_name text)
RETURNS TABLE(avg_amount numeric(12,2), sample_size integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    coalesce(round(avg(c.amount)::numeric, 2), 0)::numeric(12,2) as avg_amount,
    count(*)::int as sample_size
  from public.costs c
  join public.household_hoa h
    on h.normalized_address = c.normalized_address
  where c.vendor_id = _vendor_id
    and lower(h.hoa_name) = lower(trim(_hoa_name));
$$;

-- Set owner and grant execute
ALTER FUNCTION public.vendor_cost_stats(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.vendor_cost_stats(uuid, text) TO authenticated;

-- 8) Helper RPCs for HOA and counts
CREATE OR REPLACE FUNCTION public.get_my_hoa()
RETURNS TABLE(hoa_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select h.hoa_name from public.household_hoa h
  where h.normalized_address = public.current_user_normalized_address()
  limit 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_hoa() TO authenticated;

CREATE OR REPLACE FUNCTION public.count_my_costs()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select count(*)::int from public.costs c where c.normalized_address = public.current_user_normalized_address();
$$;
GRANT EXECUTE ON FUNCTION public.count_my_costs() TO authenticated;

-- 9) Indexes
CREATE INDEX IF NOT EXISTS idx_household_hoa_lower_name ON public.household_hoa (lower(hoa_name));
CREATE INDEX IF NOT EXISTS idx_costs_vendor_household ON public.costs (vendor_id, normalized_address);