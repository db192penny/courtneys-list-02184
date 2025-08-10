-- Fix function search_path warnings by explicitly setting search_path
CREATE OR REPLACE FUNCTION public.normalize_address(_addr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.trg_set_household_hoa_normalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.normalized_address := public.normalize_address(NEW.household_address);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_set_costs_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.normalized_address := public.normalize_address(NEW.household_address);
  NEW.currency := upper(coalesce(NEW.currency, 'USD'));
  NEW.amount := round(NEW.amount::numeric, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;