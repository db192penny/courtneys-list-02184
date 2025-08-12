-- Phase 1: Schema additions for MVP Community/Home vendor tables and admin controls

-- 1) home_vendors: personal vendor list per user
CREATE TABLE IF NOT EXISTS public.home_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  period text NOT NULL DEFAULT 'monthly',
  personal_notes text,
  contact_override text,
  my_rating integer,
  my_comments text,
  share_review_public boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, vendor_id)
);

ALTER TABLE public.home_vendors ENABLE ROW LEVEL SECURITY;

-- RLS: Only owner can CRUD their rows
CREATE POLICY "Users can read their home_vendors" ON public.home_vendors
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their home_vendors" ON public.home_vendors
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their home_vendors" ON public.home_vendors
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their home_vendors" ON public.home_vendors
FOR DELETE USING (user_id = auth.uid());

-- 2) Enhance reviews with anonymity toggle
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'anonymous'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN anonymous boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3) Enhance costs with simple structured fields for period & notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'costs' AND column_name = 'period'
  ) THEN
    ALTER TABLE public.costs ADD COLUMN period text DEFAULT 'one_time';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'costs' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.costs ADD COLUMN notes text;
  END IF;
END $$;

-- 4) Enhance vendors with Google rating and community notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'google_rating'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN google_rating numeric;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'google_rating_count'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN google_rating_count integer;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'additional_notes'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN additional_notes text;
  END IF;
END $$;

-- 5) Admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_id uuid,
  metadata jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log
FOR SELECT USING (public.is_admin());
-- No direct insert/update/delete from client; function below writes entries

-- 6) Helper to monthly-ize costs
CREATE OR REPLACE FUNCTION public.monthlyize_cost(_amount numeric, _period text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(_period, 'one_time'))
    WHEN 'monthly' THEN _amount
    WHEN 'quarterly' THEN _amount / 3.0
    WHEN 'biweekly' THEN _amount * 2.0
    WHEN 'weekly' THEN _amount * 4.0
    WHEN 'annually' THEN _amount / 12.0
    ELSE _amount
  END;
$$;

-- 7) Vendor stats for a community HOA
CREATE OR REPLACE FUNCTION public.list_vendor_stats(
  _hoa_name text,
  _category text DEFAULT NULL,
  _sort_by text DEFAULT 'homes',
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  homes_serviced integer,
  homes_pct numeric,
  hoa_rating numeric,
  hoa_rating_count integer,
  google_rating numeric,
  google_rating_count integer,
  avg_monthly_cost numeric,
  contact_info text,
  additional_notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH approved AS (
    SELECT count(*)::int AS total
    FROM public.approved_households
    WHERE lower(hoa_name) = lower(trim(_hoa_name))
  ),
  households AS (
    SELECT household_address FROM public.household_hoa
    WHERE lower(hoa_name) = lower(trim(_hoa_name))
  ),
  cost_households AS (
    SELECT c.vendor_id, count(DISTINCT c.normalized_address)::int AS homes
    FROM public.costs c
    JOIN households h ON h.household_address = c.normalized_address
    GROUP BY c.vendor_id
  ),
  home_v_households AS (
    SELECT hv.vendor_id, count(DISTINCT hh.household_address)::int AS homes
    FROM public.home_vendors hv
    JOIN public.users u ON u.id = hv.user_id
    JOIN public.household_hoa hh ON hh.household_address = public.normalize_address(u.address)
    WHERE lower(hh.hoa_name) = lower(trim(_hoa_name))
    GROUP BY hv.vendor_id
  ),
  homes AS (
    SELECT vendor_id, sum(homes)::int AS homes
    FROM (
      SELECT * FROM cost_households
      UNION ALL
      SELECT * FROM home_v_households
    ) s
    GROUP BY vendor_id
  ),
  hoa_reviews AS (
    SELECT r.vendor_id,
           avg(r.rating)::numeric(4,2) AS hoa_rating,
           count(*)::int AS hoa_rating_count
    FROM public.reviews r
    JOIN public.users u ON u.id = r.user_id
    JOIN public.household_hoa hh ON hh.household_address = public.normalize_address(u.address)
    WHERE lower(hh.hoa_name) = lower(trim(_hoa_name))
    GROUP BY r.vendor_id
  ),
  costs_m AS (
    SELECT c.vendor_id,
           round(avg(public.monthlyize_cost(c.amount, c.period))::numeric, 2) AS avg_monthly_cost
    FROM public.costs c
    JOIN households h ON h.household_address = c.normalized_address
    GROUP BY c.vendor_id
  )
  SELECT
    v.id,
    v.name,
    v.category,
    coalesce(h.homes, 0) AS homes_serviced,
    CASE WHEN a.total > 0 THEN round((coalesce(h.homes, 0)::numeric / a.total::numeric) * 100.0, 1) ELSE 0 END AS homes_pct,
    hr.hoa_rating,
    hr.hoa_rating_count,
    v.google_rating,
    v.google_rating_count,
    cm.avg_monthly_cost,
    v.contact_info,
    v.additional_notes
  FROM public.vendors v
  LEFT JOIN homes h ON h.vendor_id = v.id
  LEFT JOIN hoa_reviews hr ON hr.vendor_id = v.id
  LEFT JOIN costs_m cm ON cm.vendor_id = v.id
  CROSS JOIN approved a
  WHERE lower(v.community) = lower(trim(_hoa_name))
    AND (_category IS NULL OR lower(v.category) = lower(_category))
  ORDER BY CASE
             WHEN _sort_by = 'hoa_rating' THEN coalesce(hr.hoa_rating, 0)
             WHEN _sort_by = 'google_rating' THEN coalesce(v.google_rating, 0)
             ELSE coalesce(h.homes, 0)
           END DESC,
           v.name ASC
  LIMIT coalesce(_limit, 100)
  OFFSET coalesce(_offset, 0);
$$;

-- 8) Admin soft-delete user with audit log
CREATE OR REPLACE FUNCTION public.admin_soft_delete_user(_user_id uuid, _reason text DEFAULT 'admin_action')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_address text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Cache target address for potential use
  SELECT u.address INTO target_address FROM public.users u WHERE u.id = _user_id;

  -- Remove dependent content
  DELETE FROM public.reviews WHERE user_id = _user_id;
  DELETE FROM public.costs WHERE created_by = _user_id;
  DELETE FROM public.home_vendors WHERE user_id = _user_id;
  DELETE FROM public.invitations WHERE invited_by = _user_id;
  DELETE FROM public.vendors WHERE created_by = _user_id; -- user-created vendors

  -- Finally remove user row
  DELETE FROM public.users WHERE id = _user_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_id, metadata)
  VALUES (auth.uid(), 'soft_delete_user', _user_id, jsonb_build_object('reason', _reason, 'address', target_address));

  RETURN true;
END;
$$;