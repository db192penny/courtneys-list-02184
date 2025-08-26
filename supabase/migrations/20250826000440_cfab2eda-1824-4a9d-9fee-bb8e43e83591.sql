-- Create user_sessions table (no RLS)
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- nullable to allow anonymous sessions
  session_token TEXT NOT NULL,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  country TEXT,
  community TEXT,
  page_path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 1,
  is_bounce BOOLEAN DEFAULT false,
  is_returning_user BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_analytics table (no RLS) 
CREATE TABLE public.user_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.user_sessions(id),
  user_id UUID, -- nullable to allow anonymous events
  event_type TEXT NOT NULL, -- 'page_view', 'button_click', 'form_submit', etc.
  event_name TEXT NOT NULL, -- specific action like 'rate_vendor', 'add_cost', etc.
  page_path TEXT,
  element_id TEXT,
  element_text TEXT,
  vendor_id UUID,
  category TEXT,
  community TEXT,
  device_type TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_community ON public.user_sessions(community);
CREATE INDEX idx_user_sessions_created_at ON public.user_sessions(created_at);
CREATE INDEX idx_user_sessions_device_type ON public.user_sessions(device_type);

CREATE INDEX idx_user_analytics_session_id ON public.user_analytics(session_id);
CREATE INDEX idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX idx_user_analytics_community ON public.user_analytics(community);
CREATE INDEX idx_user_analytics_created_at ON public.user_analytics(created_at);
CREATE INDEX idx_user_analytics_vendor_id ON public.user_analytics(vendor_id);

-- Helper function to get analytics summary (admin only)
CREATE OR REPLACE FUNCTION public.get_analytics_summary(_days integer DEFAULT 30)
RETURNS TABLE(
  total_sessions bigint,
  unique_users bigint,
  total_events bigint,
  top_pages jsonb,
  top_events jsonb,
  device_breakdown jsonb,
  community_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH analytics_data AS (
    SELECT 
      COUNT(DISTINCT s.id) as session_count,
      COUNT(DISTINCT s.user_id) as user_count,
      COUNT(a.id) as event_count
    FROM public.user_sessions s
    LEFT JOIN public.user_analytics a ON a.session_id = s.id
    WHERE s.created_at >= now() - (_days || ' days')::interval
  ),
  page_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object('page', page_path, 'views', view_count)
      ORDER BY view_count DESC
    ) as top_pages
    FROM (
      SELECT page_path, COUNT(*) as view_count
      FROM public.user_analytics
      WHERE event_type = 'page_view' 
        AND created_at >= now() - (_days || ' days')::interval
      GROUP BY page_path
      ORDER BY view_count DESC
      LIMIT 10
    ) pages
  ),
  event_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object('event', event_name, 'count', event_count)
      ORDER BY event_count DESC
    ) as top_events
    FROM (
      SELECT event_name, COUNT(*) as event_count
      FROM public.user_analytics
      WHERE created_at >= now() - (_days || ' days')::interval
      GROUP BY event_name
      ORDER BY event_count DESC
      LIMIT 10
    ) events
  ),
  device_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object('device', device_type, 'count', device_count)
    ) as device_breakdown
    FROM (
      SELECT 
        COALESCE(device_type, 'Unknown') as device_type, 
        COUNT(*) as device_count
      FROM public.user_sessions
      WHERE created_at >= now() - (_days || ' days')::interval
      GROUP BY device_type
    ) devices
  ),
  community_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object('community', community, 'sessions', session_count)
    ) as community_breakdown
    FROM (
      SELECT 
        COALESCE(community, 'Unknown') as community, 
        COUNT(*) as session_count
      FROM public.user_sessions
      WHERE created_at >= now() - (_days || ' days')::interval
      GROUP BY community
    ) communities
  )
  SELECT 
    ad.session_count,
    ad.user_count,
    ad.event_count,
    ps.top_pages,
    es.top_events,
    ds.device_breakdown,
    cs.community_breakdown
  FROM analytics_data ad
  CROSS JOIN page_stats ps
  CROSS JOIN event_stats es
  CROSS JOIN device_stats ds
  CROSS JOIN community_stats cs;
END;
$function$;