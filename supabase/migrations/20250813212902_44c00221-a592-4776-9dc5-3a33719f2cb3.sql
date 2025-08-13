-- Create badge_levels table for configurable badge system
CREATE TABLE public.badge_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'star',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create point_rewards table for configurable point values
CREATE TABLE public.point_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badge_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for badge_levels
CREATE POLICY "Anyone can read badge levels" 
ON public.badge_levels 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage badge levels" 
ON public.badge_levels 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- RLS policies for point_rewards
CREATE POLICY "Anyone can read point rewards" 
ON public.point_rewards 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage point rewards" 
ON public.point_rewards 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Insert default badge levels
INSERT INTO public.badge_levels (name, min_points, color, icon) VALUES
('Newcomer', 0, '#6b7280', 'user'),
('Contributor', 25, '#059669', 'users'),
('Helper', 75, '#0891b2', 'heart'),
('Expert', 150, '#7c3aed', 'star'),
('Champion', 300, '#dc2626', 'crown'),
('Legend', 500, '#ea580c', 'trophy');

-- Insert default point rewards
INSERT INTO public.point_rewards (activity, points, description) VALUES
('vendor_submission', 10, 'Adding a new vendor to the community'),
('review_submission', 5, 'Writing a review for a vendor'),
('cost_submission', 5, 'Sharing cost information'),
('first_login', 5, 'Welcome bonus for joining the community');

-- Add update triggers
CREATE TRIGGER update_badge_levels_updated_at
  BEFORE UPDATE ON public.badge_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_point_rewards_updated_at
  BEFORE UPDATE ON public.point_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();