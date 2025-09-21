import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// GA4 Measurement ID
const GA_MEASUREMENT_ID = 'G-89WW8L9NNQ';

// Debug mode - set to false in production
const DEBUG_MODE = window.location.hostname === 'localhost';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

interface GoogleAnalyticsProps {
  user?: any; // Your user object from Supabase auth
}

export default function GoogleAnalytics({ user }: GoogleAnalyticsProps) {
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollDepthTracked = useRef(new Set<number>());
  const pageStartTime = useRef<number>(Date.now());
  const lastPage = useRef<string>('');
  const sessionStartTime = useRef<number>(Date.now());
  const pagesViewed = useRef<number>(0);
  const vendorImpressions = useRef(new Set<string>());

  // Initialize GA4
  useEffect(() => {
    if (!isInitialized && window.gtag) {
      // Initialize with measurement ID
      window.gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // We'll handle this manually
        debug_mode: DEBUG_MODE
      });

      // Track session start
      window.gtag('event', 'session_start', {
        engagement_time_msec: 100,
        session_id: Date.now()
      });

      setIsInitialized(true);
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Initialized with ID:', GA_MEASUREMENT_ID);
      }
    }
  }, [isInitialized]);

  // Set user properties when user logs in/out
  useEffect(() => {
    if (!window.gtag || !isInitialized) return;

    if (user) {
      // Parse user name
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      let displayName = 'Anonymous';
      
      if (fullName) {
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts[nameParts.length - 1] || '';
        const lastInitial = lastName.charAt(0).toUpperCase();
        
        if (firstName && lastInitial) {
          displayName = `${firstName} ${lastInitial}.`;
        } else if (firstName) {
          displayName = firstName;
        }
      }

      // Set user properties
      window.gtag('set', 'user_properties', {
        user_name: displayName,
        user_status: user.email_verified ? 'verified' : 'unverified',
        user_type: 'registered',
        community: user.user_metadata?.community || 'unknown',
        user_id_partial: user.id.substring(0, 8),
        signup_date: new Date(user.created_at).toLocaleDateString()
      });

      // Set user ID for cross-device tracking
      window.gtag('config', GA_MEASUREMENT_ID, {
        user_id: user.id.substring(0, 8)
      });

      // Track login
      window.gtag('event', 'login', {
        method: 'email'
      });

      if (DEBUG_MODE) {
        console.log('🔵 GA4 User Set:', displayName);
      }
    } else {
      // User is logged out
      window.gtag('set', 'user_properties', {
        user_name: 'Visitor',
        user_status: 'visitor',
        user_type: 'anonymous'
      });
    }
  }, [user, isInitialized]);

  // Track page views
  useEffect(() => {
    if (!window.gtag || !isInitialized) return;

    // Track time on previous page
    if (lastPage.current) {
      const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
      window.gtag('event', 'page_timing', {
        page_path: lastPage.current,
        time_on_page: timeOnPage
      });
    }

    // Track new page view
    window.gtag('event', 'page_view', {
      page_path: location.pathname,
      page_location: window.location.href,
      page_title: document.title
    });

    // Update tracking variables
    lastPage.current = location.pathname;
    pageStartTime.current = Date.now();
    pagesViewed.current++;
    scrollDepthTracked.current.clear(); // Reset scroll tracking for new page
    vendorImpressions.current.clear(); // Reset vendor impressions

    if (DEBUG_MODE) {
      console.log('🔵 GA4 Page View:', location.pathname);
    }

    // Set up scroll tracking for this page
    setupScrollTracking();
    
    // Set up vendor impression tracking
    setupImpressionTracking();

  }, [location, isInitialized]);

  // Scroll depth tracking
  const setupScrollTracking = () => {
    const trackScroll = () => {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      const thresholds = [25, 50, 75, 90];
      thresholds.forEach(threshold => {
        if (scrollPercentage >= threshold && !scrollDepthTracked.current.has(threshold)) {
          scrollDepthTracked.current.add(threshold);
          window.gtag('event', 'scroll', {
            percent_scrolled: threshold,
            page_path: location.pathname
          });
          
          if (DEBUG_MODE) {
            console.log(`🔵 GA4 Scroll Depth: ${threshold}%`);
          }
        }
      });
    };

    window.addEventListener('scroll', trackScroll, { passive: true });
    return () => window.removeEventListener('scroll', trackScroll);
  };

  // Track vendor card impressions
  const setupImpressionTracking = () => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const vendorCard = entry.target as HTMLElement;
          const vendorId = vendorCard.getAttribute('data-vendor-id');
          const vendorName = vendorCard.getAttribute('data-vendor-name');
          
          if (vendorId && !vendorImpressions.current.has(vendorId)) {
            vendorImpressions.current.add(vendorId);
            window.gtag('event', 'vendor_impression', {
              vendor_id: vendorId,
              vendor_name: vendorName,
              page_path: location.pathname
            });
            
            if (DEBUG_MODE) {
              console.log('🔵 GA4 Vendor Impression:', vendorName);
            }
          }
        }
      });
    };

    // Wait for DOM to be ready
    setTimeout(() => {
      const observer = new IntersectionObserver(observerCallback, {
        threshold: 0.5 // Vendor card is 50% visible
      });

      // Observe all vendor cards
      document.querySelectorAll('[data-vendor-id]').forEach(card => {
        observer.observe(card);
      });

      return () => observer.disconnect();
    }, 1000);
  };

  // Track unload events
  useEffect(() => {
    const handleUnload = () => {
      const sessionDuration = Math.round((Date.now() - sessionStartTime.current) / 1000);
      const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
      
      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        const data = new FormData();
        data.append('event', 'session_end');
        data.append('session_duration', sessionDuration.toString());
        data.append('pages_viewed', pagesViewed.current.toString());
        data.append('last_page', location.pathname);
        data.append('time_on_last_page', timeOnPage.toString());
        
        navigator.sendBeacon(`https://www.google-analytics.com/collect?tid=${GA_MEASUREMENT_ID}`, data);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [location]);

  return null; // This component doesn't render anything
}

// Export tracking utility functions
export const GATracking = {
  // Track button clicks
  trackButtonClick: (buttonName: string, context?: any) => {
    if (window.gtag) {
      window.gtag('event', 'button_click', {
        button_name: buttonName,
        page_path: window.location.pathname,
        ...context
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Button Click:', buttonName, context);
      }
    }
  },

  // Track vendor interactions
  trackVendorClick: (vendor: any) => {
    if (window.gtag) {
      window.gtag('event', 'vendor_click', {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        vendor_category: vendor.category,
        page_path: window.location.pathname
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Vendor Click:', vendor.name);
      }
    }
  },

  // Track modal opens
  trackModalOpen: (modalType: string, context?: any) => {
    if (window.gtag) {
      window.gtag('event', 'modal_open', {
        modal_type: modalType,
        page_path: window.location.pathname,
        ...context
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Modal Open:', modalType);
      }
    }
  },

  // Track form submissions
  trackFormSubmit: (formType: string, data?: any) => {
    if (window.gtag) {
      window.gtag('event', 'form_submit', {
        form_type: formType,
        page_path: window.location.pathname,
        ...data
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Form Submit:', formType);
      }
    }
  },

  // Track category changes
  trackCategoryChange: (fromCategory: string, toCategory: string) => {
    if (window.gtag) {
      window.gtag('event', 'category_change', {
        from_category: fromCategory,
        to_category: toCategory,
        page_path: window.location.pathname
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Category Change:', fromCategory, '→', toCategory);
      }
    }
  },

  // Track review submission
  trackReviewSubmit: (vendor: any, rating: number) => {
    if (window.gtag) {
      window.gtag('event', 'review_submission', {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        rating: rating,
        page_path: window.location.pathname
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Review Submit:', vendor.name, rating);
      }
    }
  },

  // Track cost submission
  trackCostSubmit: (vendor: any, amount: number) => {
    if (window.gtag) {
      window.gtag('event', 'cost_submission', {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        cost_amount: amount,
        page_path: window.location.pathname
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Cost Submit:', vendor.name, amount);
      }
    }
  },

  // Track search
  trackSearch: (searchTerm: string, resultsCount: number) => {
    if (window.gtag) {
      window.gtag('event', 'search', {
        search_term: searchTerm,
        results_count: resultsCount,
        page_path: window.location.pathname
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Search:', searchTerm);
      }
    }
  },

  // Generic event tracking
  trackEvent: (eventName: string, parameters?: any) => {
    if (window.gtag) {
      window.gtag('event', eventName, {
        page_path: window.location.pathname,
        ...parameters
      });
      
      if (DEBUG_MODE) {
        console.log('🔵 GA4 Event:', eventName, parameters);
      }
    }
  }
};