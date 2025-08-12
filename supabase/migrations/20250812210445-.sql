-- Fix: drop existing function before redefining with new return type
DROP FUNCTION IF EXISTS public.list_vendor_stats(text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.list_vendor_stats(
  _hoa_name text,
  _category text DEFAULT NULL::text,
  _sort_by text DEFAULT 'homes'::text,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
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
  monthly_sample_size integer,
  service_call_avg numeric,
  service_call_sample_size integer,
  contact_info text,
  typical_cost numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
           round(avg(public.monthlyize_cost(c.amount, c.period))::numeric, 2) AS avg_monthly_cost,
           count(*)::int AS monthly_sample_size
    FROM public.costs c
    JOIN households h ON h.household_address = c.normalized_address
    WHERE lower(coalesce(c.cost_kind, '')) = 'monthly_plan'
       OR lower(coalesce(c.period, '')) IN ('monthly','quarterly','annually','weekly','biweekly')
    GROUP BY c.vendor_id
  ),
  costs_sc AS (
    SELECT c.vendor_id,
           round(avg(c.amount)::numeric, 2) AS service_call_avg,
           count(*)::int AS service_call_sample_size
    FROM public.costs c
    JOIN households h ON h.household_address = c.normalized_address
    WHERE lower(coalesce(c.cost_kind, '')) = 'service_call'
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
    cm.monthly_sample_size,
    sc.service_call_avg,
    sc.service_call_sample_size,
    v.contact_info,
    v.typical_cost
  FROM public.vendors v
  LEFT JOIN homes h ON h.vendor_id = v.id
  LEFT JOIN hoa_reviews hr ON hr.vendor_id = v.id
  LEFT JOIN costs_m cm ON cm.vendor_id = v.id
  LEFT JOIN costs_sc sc ON sc.vendor_id = v.id
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