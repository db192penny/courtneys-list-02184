-- Create user_point_history table to track all point-earning activities
CREATE TABLE public.user_point_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL,
  description TEXT NOT NULL,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_point_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own point history
CREATE POLICY "Users can read their own point history" 
ON public.user_point_history 
FOR SELECT 
USING (user_id = auth.uid());

-- Create policy for system to insert point history
CREATE POLICY "System can insert point history" 
ON public.user_point_history 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_user_point_history_user_id ON public.user_point_history(user_id);
CREATE INDEX idx_user_point_history_created_at ON public.user_point_history(created_at);

-- Update existing point triggers to also log to history

-- Enhanced vendor points trigger
CREATE OR REPLACE FUNCTION public.trg_vendor_points_with_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 10 points for vendor submission
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 10
  WHERE id = NEW.created_by;
  
  -- Log to point history
  INSERT INTO public.user_point_history (
    user_id, 
    activity_type, 
    points_earned, 
    description, 
    related_id
  ) VALUES (
    NEW.created_by,
    'vendor_submission',
    10,
    'Submitted vendor: ' || NEW.name,
    NEW.id
  );
  
  RETURN NEW;
END;
$function$;

-- Enhanced review points trigger
CREATE OR REPLACE FUNCTION public.trg_review_points_with_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 5 points for review submission
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 5
  WHERE id = NEW.user_id;
  
  -- Log to point history
  INSERT INTO public.user_point_history (
    user_id, 
    activity_type, 
    points_earned, 
    description, 
    related_id
  ) VALUES (
    NEW.user_id,
    'review_submission',
    5,
    'Reviewed vendor with ' || NEW.rating || ' stars',
    NEW.id
  );
  
  RETURN NEW;
END;
$function$;

-- Enhanced cost points trigger
CREATE OR REPLACE FUNCTION public.trg_cost_points_with_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 5 points for cost submission
  UPDATE public.users 
  SET points = COALESCE(points, 0) + 5
  WHERE id = NEW.created_by;
  
  -- Log to point history
  INSERT INTO public.user_point_history (
    user_id, 
    activity_type, 
    points_earned, 
    description, 
    related_id
  ) VALUES (
    NEW.created_by,
    'cost_submission',
    5,
    'Shared cost information: $' || NEW.amount,
    NEW.id
  );
  
  RETURN NEW;
END;
$function$;

-- Update triggers to use new functions
DROP TRIGGER IF EXISTS vendor_points_trigger ON public.vendors;
CREATE TRIGGER vendor_points_trigger
  AFTER INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vendor_points_with_history();

DROP TRIGGER IF EXISTS review_points_trigger ON public.reviews;
CREATE TRIGGER review_points_trigger
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_review_points_with_history();

DROP TRIGGER IF EXISTS cost_points_trigger ON public.costs;
CREATE TRIGGER cost_points_trigger
  AFTER INSERT ON public.costs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cost_points_with_history();