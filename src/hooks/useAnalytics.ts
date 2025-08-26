import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsSession {
  id: string;
  sessionToken: string;
  startTime: Date;
}

interface TrackEventOptions {
  eventType: 'page_view' | 'button_click' | 'form_submit' | 'modal_open' | 'modal_close';
  eventName: string;
  elementId?: string;
  elementText?: string;
  vendorId?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export function useAnalytics() {
  const { user } = useAuth();
  const [session, setSession] = useState<AnalyticsSession | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const lastPageRef = useRef<string>('');

  // Generate session token
  const generateSessionToken = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Detect device info
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    let deviceType = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Device detection
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent)) {
      deviceType = /iPad/i.test(userAgent) ? 'Tablet' : 'Mobile';
    }

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
  };

  // Get community from current path
  const getCommunity = () => {
    const path = window.location.pathname;
    if (path.includes('/communities/')) {
      const segments = path.split('/');
      const communityIndex = segments.indexOf('communities');
      return segments[communityIndex + 1] || null;
    }
    return null;
  };

  // Initialize session
  const initializeSession = async () => {
    // Check if we already have an active session in the last 5 minutes
    const existingSessionKey = 'analytics_active_session';
    const existingSession = localStorage.getItem(existingSessionKey);
    
    if (existingSession) {
      try {
        const parsedSession = JSON.parse(existingSession);
        const sessionAge = Date.now() - parsedSession.timestamp;
        
        // If session is less than 5 minutes old, reuse it
        if (sessionAge < 5 * 60 * 1000) {
          console.log('Reusing existing analytics session:', parsedSession.sessionToken);
          setSession({
            id: parsedSession.id,
            sessionToken: parsedSession.sessionToken,
            startTime: new Date(parsedSession.startTime)
          });
          return;
        }
      } catch (e) {
        console.warn('Failed to parse existing session:', e);
      }
    }

    const sessionToken = generateSessionToken();
    const { deviceType, browser, os } = getDeviceInfo();
    const community = getCommunity();
    
    console.log('Creating new analytics session for user:', user?.id || 'anonymous');
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user?.id || null,
          session_token: sessionToken,
          device_type: deviceType,
          browser: browser,
          os: os,
          community: community,
          page_path: window.location.pathname,
          referrer: document.referrer || null,
          utm_source: new URLSearchParams(window.location.search).get('utm_source'),
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
          session_start: new Date().toISOString(),
          is_returning_user: localStorage.getItem('analytics_returning_user') === 'true'
        })
        .select()
        .single();

      if (error) throw error;

      const newSession = {
        id: data.id,
        sessionToken,
        startTime: new Date()
      };

      setSession(newSession);
      
      // Store session info to prevent duplicates
      localStorage.setItem(existingSessionKey, JSON.stringify({
        id: data.id,
        sessionToken,
        startTime: newSession.startTime.toISOString(),
        timestamp: Date.now()
      }));
      
      localStorage.setItem('analytics_returning_user', 'true');
      
      // Track initial page view
      await trackEvent({
        eventType: 'page_view',
        eventName: 'page_load',
        metadata: { initialLoad: true }
      });

    } catch (error) {
      console.warn('Analytics session initialization failed:', error);
    }
  };

  // Track event
  const trackEvent = async (options: TrackEventOptions) => {
    if (!session) return;

    const { deviceType } = getDeviceInfo();
    const community = getCommunity();

    try {
      await supabase
        .from('user_analytics')
        .insert({
          session_id: session.id,
          user_id: user?.id || null,
          event_type: options.eventType,
          event_name: options.eventName,
          page_path: window.location.pathname,
          element_id: options.elementId,
          element_text: options.elementText,
          vendor_id: options.vendorId,
          category: options.category,
          community: community,
          device_type: deviceType,
          metadata: options.metadata
        });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  };

  // Track page view
  const trackPageView = async (pagePath?: string) => {
    const currentPage = pagePath || window.location.pathname;
    
    if (currentPage !== lastPageRef.current) {
      lastPageRef.current = currentPage;
      
      await trackEvent({
        eventType: 'page_view',
        eventName: 'page_navigation',
        metadata: { 
          previousPage: lastPageRef.current,
          timestamp: Date.now()
        }
      });
    }
  };

  // End session
  const endSession = async () => {
    if (!session) return;

    const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);

    try {
      await supabase
        .from('user_sessions')
        .update({
          session_end: new Date().toISOString(),
          duration_seconds: duration
        })
        .eq('id', session.id);
      
      // Clear stored session data
      localStorage.removeItem('analytics_active_session');
      console.log('Analytics session ended:', session.sessionToken);
    } catch (error) {
      console.warn('Session end tracking failed:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeSession();

    // Track page changes
    const handlePopState = () => {
      trackPageView();
    };

    window.addEventListener('popstate', handlePopState);

    // End session on page unload
    const handleBeforeUnload = () => {
      endSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [user]);

  return {
    trackEvent,
    trackPageView,
    session
  };
}