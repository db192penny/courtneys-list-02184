DROP FUNCTION IF EXISTS public.list_vendor_stats(text,text,text,integer,integer);

CREATE OR REPLACE FUNCTION public.list_vendor_stats(_hoa_name text, _category text DEFAULT NULL::text, _sort_by text DEFAULT 'homes'::text, _limit integer DEFAULT 100, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, category text, homes_serviced integer, homes_pct numeric, hoa_rating numeric, hoa_rating_count integer, google_rating numeric, google_rating_count integer, google_reviews_json jsonb, google_place_id text, avg_monthly_cost numeric, monthly_sample_size integer, service_call_avg numeric, service_call_sample_size integer, contact_info text, typical_cost numeric, avg_cost_display text, avg_cost_amount numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH approved AS (
    SELECT count(*)::int AS total
    FROM public.approved_households
    WHERE lower(hoa_name) = lower(trim(_hoa_name))
  ),
  households AS (
    SELECT household_address FROM public.household_hoa
    WHERE lower(hoa_name) = lower(trim(_hoa_name))
  ),
  homes AS (
    SELECT vendor_id, count(DISTINCT normalized_address)::int AS homes
    FROM (
      SELECT c.vendor_id, c.normalized_address
      FROM public.costs c
      JOIN households h ON h.household_address = c.normalized_address
      
      UNION
      
      SELECT hv.vendor_id, public.normalize_address(u.address) as normalized_address
      FROM public.home_vendors hv
      JOIN public.users u ON u.id = hv.user_id
      JOIN public.household_hoa hh ON hh.household_address = public.normalize_address(u.address)
      WHERE lower(hh.hoa_name) = lower(trim(_hoa_name))
      
      UNION
      
      SELECT v.id as vendor_id, public.normalize_address(u.address) as normalized_address
      FROM public.vendors v
      JOIN public.users u ON u.id = v.created_by
      JOIN public.household_hoa hh ON hh.household_address = public.normalize_address(u.address)
      WHERE lower(hh.hoa_name) = lower(trim(_hoa_name))
        AND NOT public.has_role(v.created_by, 'admin'::public.app_role)
      
      UNION
      
      SELECT r.vendor_id, public.normalize_address(u.address) as normalized_address
      FROM public.reviews r
      JOIN public.users u ON u.id = r.user_id
      JOIN public.household_hoa hh ON hh.household_address = public.normalize_address(u.address)
      WHERE lower(hh.hoa_name) = lower(trim(_hoa_name))
    ) all_addresses
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
  ),
  costs_hourly AS (
    SELECT c.vendor_id,
           round(avg(c.amount)::numeric, 2) AS hourly_avg,
           count(*)::int AS hourly_sample_size
    FROM public.costs c
    JOIN households h ON h.household_address = c.normalized_address
    WHERE lower(coalesce(c.cost_kind, '')) = 'hourly'
    GROUP BY c.vendor_id
  ),
  ca AS (
    SELECT total_homes FROM public.community_assets
    WHERE lower(hoa_name) = lower(trim(_hoa_name))
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    v.id,
    v.name,
    v.category,
    coalesce(h.homes, 0) AS homes_serviced,
    CASE 
      WHEN NULLIF(coalesce((SELECT total_homes FROM ca LIMIT 1), (SELECT total FROM approved LIMIT 1)), 0) IS NOT NULL
        THEN round(
          (coalesce(h.homes, 0)::numeric / NULLIF(coalesce((SELECT total_homes FROM ca LIMIT 1), (SELECT total FROM approved LIMIT 1)), 0)::numeric) * 100.0
          , 1)
      ELSE 0
    END AS homes_pct,
    hr.hoa_rating,
    hr.hoa_rating_count,
    v.google_rating,
    v.google_rating_count,
    v.google_reviews_json,
    v.google_place_id,
    cm.avg_monthly_cost,
    cm.monthly_sample_size,
    sc.service_call_avg,
    sc.service_call_sample_size,
    v.contact_info,
    v.typical_cost,
    CASE 
      WHEN lower(v.category) IN ('pool', 'pool service', 'landscaping', 'pest control') THEN
        CASE WHEN cm.avg_monthly_cost IS NOT NULL THEN 'per Month' ELSE 'See in Reviews' END
      WHEN lower(v.category) IN ('hvac', 'power washing', 'pressure washing') THEN
        CASE WHEN sc.service_call_avg IS NOT NULL THEN 'per Visit' ELSE 'See in Reviews' END
      WHEN lower(v.category) IN ('plumbing', 'electrical') THEN
        CASE WHEN sc.service_call_avg IS NOT NULL THEN 'per Visit' ELSE 'See in Reviews' END
      WHEN lower(v.category) = 'handyman' THEN
        CASE WHEN ch.hourly_avg IS NOT NULL THEN 'per Hour' ELSE 'See in Reviews' END
      WHEN lower(v.category) IN ('roofing', 'general contractor') THEN
        'See in Reviews'
      ELSE
        CASE WHEN cm.avg_monthly_cost IS NOT NULL THEN 'per Month' 
             WHEN sc.service_call_avg IS NOT NULL THEN 'per Visit'
             WHEN ch.hourly_avg IS NOT NULL THEN 'per Hour'
             ELSE 'See in Reviews' END
    END AS avg_cost_display,
    CASE 
      WHEN lower(v.category) IN ('pool', 'pool service', 'landscaping', 'pest control') THEN cm.avg_monthly_cost
      WHEN lower(v.category) IN ('hvac', 'power washing', 'pressure washing') THEN sc.service_call_avg
      WHEN lower(v.category) IN ('plumbing', 'electrical') THEN sc.service_call_avg
      WHEN lower(v.category) = 'handyman' THEN ch.hourly_avg
      ELSE NULL
    END AS avg_cost_amount
  FROM public.vendors v
  LEFT JOIN homes h ON h.vendor_id = v.id
  LEFT JOIN hoa_reviews hr ON hr.vendor_id = v.id
  LEFT JOIN costs_m cm ON cm.vendor_id = v.id
  LEFT JOIN costs_sc sc ON sc.vendor_id = v.id
  LEFT JOIN costs_hourly ch ON ch.vendor_id = v.id
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
$function$