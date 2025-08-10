-- Points system migration: triggers to maintain users.points and backfill existing data

-- 1) Trigger function: update points for vendor submissions (+10)
CREATE OR REPLACE FUNCTION public.trg_vendor_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NOT NULL THEN
      UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) + 10) WHERE id = NEW.created_by;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.created_by IS NOT NULL THEN
      UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) - 10) WHERE id = OLD.created_by;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.created_by IS DISTINCT FROM NEW.created_by) THEN
      IF OLD.created_by IS NOT NULL THEN
        UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) - 10) WHERE id = OLD.created_by;
      END IF;
      IF NEW.created_by IS NOT NULL THEN
        UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) + 10) WHERE id = NEW.created_by;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Trigger function: update points for reviews (+5)
CREATE OR REPLACE FUNCTION public.trg_review_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) + 5) WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) - 5) WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
      IF OLD.user_id IS NOT NULL THEN
        UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) - 5) WHERE id = OLD.user_id;
      END IF;
      IF NEW.user_id IS NOT NULL THEN
        UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) + 5) WHERE id = NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Trigger function: update points for household costs (+5)
CREATE OR REPLACE FUNCTION public.trg_cost_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NOT NULL THEN
      UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) + 5) WHERE id = NEW.created_by;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.created_by IS NOT NULL THEN
      UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) - 5) WHERE id = OLD.created_by;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.created_by IS DISTINCT FROM NEW.created_by) THEN
      IF OLD.created_by IS NOT NULL THEN
        UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) - 5) WHERE id = OLD.created_by;
      END IF;
      IF NEW.created_by IS NOT NULL THEN
        UPDATE public.users SET points = GREATEST(0, COALESCE(points, 0) + 5) WHERE id = NEW.created_by;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Attach triggers to tables (drop if exist to be idempotent)
-- Vendors: also ensure the existing submissions_count logic runs on insert
DROP TRIGGER IF EXISTS vendors_points_aiud ON public.vendors;
CREATE TRIGGER vendors_points_aiud
AFTER INSERT OR DELETE OR UPDATE OF created_by ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.trg_vendor_points();

DROP TRIGGER IF EXISTS vendors_handle_insert ON public.vendors;
CREATE TRIGGER vendors_handle_insert
AFTER INSERT ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.handle_vendor_insert();

-- Reviews
DROP TRIGGER IF EXISTS reviews_points_aiud ON public.reviews;
CREATE TRIGGER reviews_points_aiud
AFTER INSERT OR DELETE OR UPDATE OF user_id ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_review_points();

-- Costs
DROP TRIGGER IF EXISTS costs_points_aiud ON public.costs;
CREATE TRIGGER costs_points_aiud
AFTER INSERT OR DELETE OR UPDATE OF created_by ON public.costs
FOR EACH ROW EXECUTE FUNCTION public.trg_cost_points();

-- 5) Backfill users.points based on existing data
UPDATE public.users u
SET points = (
  COALESCE((SELECT count(*) FROM public.vendors v WHERE v.created_by = u.id), 0) * 10
  + COALESCE((SELECT count(*) FROM public.reviews r WHERE r.user_id = u.id), 0) * 5
  + COALESCE((SELECT count(*) FROM public.costs c WHERE c.created_by = u.id), 0) * 5
);
