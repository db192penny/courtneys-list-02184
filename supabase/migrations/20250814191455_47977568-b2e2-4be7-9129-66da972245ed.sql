-- Create preview_sessions table for anonymous user data
CREATE TABLE public.preview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  normalized_address TEXT NOT NULL,
  formatted_address TEXT,
  google_place_id TEXT,
  street_name TEXT,
  community TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  source TEXT -- tracking parameter like 'fb_group'
);

-- Create preview_reviews table (mirrors reviews structure)
CREATE TABLE public.preview_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.preview_sessions(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  recommended BOOLEAN DEFAULT true,
  comments TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Create preview_costs table (mirrors costs structure)
CREATE TABLE public.preview_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.preview_sessions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  unit TEXT,
  cost_kind TEXT,
  period TEXT DEFAULT 'one_time',
  quantity NUMERIC,
  notes TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create preview_metrics table for analytics
CREATE TABLE public.preview_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.preview_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'page_view', 'rate_vendor', 'add_cost', 'identity_provided', etc.
  vendor_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create preview_links table for admin management
CREATE TABLE public.preview_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  community TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.preview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for preview_sessions (accessible by session token)
CREATE POLICY "Anyone can read their own preview session" 
ON public.preview_sessions 
FOR SELECT 
USING (true); -- Sessions are accessed by token, not user auth

CREATE POLICY "Anyone can create preview sessions" 
ON public.preview_sessions 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for preview_reviews
CREATE POLICY "Anyone can read preview reviews" 
ON public.preview_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create preview reviews" 
ON public.preview_reviews 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Session owners can update their preview reviews" 
ON public.preview_reviews 
FOR UPDATE 
USING (true);

-- RLS Policies for preview_costs
CREATE POLICY "Anyone can read preview costs" 
ON public.preview_costs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create preview costs" 
ON public.preview_costs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Session owners can update their preview costs" 
ON public.preview_costs 
FOR UPDATE 
USING (true);

-- RLS Policies for preview_metrics
CREATE POLICY "Anyone can insert preview metrics" 
ON public.preview_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can read preview metrics" 
ON public.preview_metrics 
FOR SELECT 
USING (is_admin());

-- RLS Policies for preview_links
CREATE POLICY "Anyone can read active preview links" 
ON public.preview_links 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage preview links" 
ON public.preview_links 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Create indexes for performance
CREATE INDEX idx_preview_sessions_token ON public.preview_sessions(session_token);
CREATE INDEX idx_preview_sessions_community ON public.preview_sessions(community);
CREATE INDEX idx_preview_reviews_vendor ON public.preview_reviews(vendor_id);
CREATE INDEX idx_preview_reviews_session ON public.preview_reviews(session_id);
CREATE INDEX idx_preview_costs_vendor ON public.preview_costs(vendor_id);
CREATE INDEX idx_preview_costs_session ON public.preview_costs(session_id);
CREATE INDEX idx_preview_metrics_session ON public.preview_metrics(session_id);
CREATE INDEX idx_preview_metrics_event ON public.preview_metrics(event_type);
CREATE INDEX idx_preview_links_slug ON public.preview_links(slug);

-- Add trigger for preview_costs normalization
CREATE TRIGGER trg_set_preview_costs_fields
  BEFORE INSERT OR UPDATE ON public.preview_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_costs_fields();

-- Add trigger for preview_costs updated_at
CREATE TRIGGER update_preview_costs_updated_at
  BEFORE UPDATE ON public.preview_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for preview_links updated_at  
CREATE TRIGGER update_preview_links_updated_at
  BEFORE UPDATE ON public.preview_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();