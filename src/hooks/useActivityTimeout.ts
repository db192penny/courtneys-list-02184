import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Activity timeout configuration
const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD = 25 * 60 * 1000; // 25 minutes
const ACTIVITY_THROTTLE = 60 * 1000; // 1 minute throttle for localStorage updates
const STORAGE_KEY = 'lastActivityTime';
const WARNING_STORAGE_KEY = 'activityWarningShown';

export function useActivityTimeout(isAuthenticated: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const warningShownRef = useRef<boolean>(false);

  // Clear existing timeouts
  const clearActivityTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    console.log('[ActivityTimeout] Auto-logging out due to inactivity');
    await supabase.auth.signOut();
  };

  // Show warning before logout
  const showWarning = () => {
    if (warningShownRef.current) return;
    
    warningShownRef.current = true;
    localStorage.setItem(WARNING_STORAGE_KEY, 'true');
    
    toast({
      title: "Session Timeout Warning",
      description: "You'll be logged out in 5 minutes due to inactivity. Click 'Stay logged in' to continue your session.",
      duration: 60000, // Show for 1 minute
    });
  };

  // Reset activity timer
  const resetActivityTimer = () => {
    if (!isAuthenticated) return;

    const now = Date.now();
    
    // Update localStorage with throttling
    if (now - lastUpdateRef.current > ACTIVITY_THROTTLE) {
      localStorage.setItem(STORAGE_KEY, now.toString());
      lastUpdateRef.current = now;
    }

    // Clear warning state
    warningShownRef.current = false;
    localStorage.removeItem(WARNING_STORAGE_KEY);

    // Clear existing timeouts
    clearActivityTimeout();

    // Set warning timeout (25 minutes)
    warningTimeoutRef.current = setTimeout(showWarning, WARNING_THRESHOLD);
    
    // Set logout timeout (30 minutes)  
    timeoutRef.current = setTimeout(handleLogout, TIMEOUT_DURATION);
  };

  // Handle storage changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      const lastActivity = parseInt(e.newValue);
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;

      if (timeSinceActivity < TIMEOUT_DURATION) {
        // Activity detected in another tab, reset timer
        resetActivityTimer();
      }
    }
  };

  // Activity event handler with throttling
  const handleActivity = () => {
    if (!isAuthenticated) return;
    resetActivityTimer();
  };

  useEffect(() => {
    if (!isAuthenticated) {
      clearActivityTimeout();
      return;
    }

    console.log('[ActivityTimeout] Setting up activity monitoring');

    // Activity events to monitor
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for storage changes (cross-tab synchronization)
    window.addEventListener('storage', handleStorageChange);

    // Check for existing activity and initialize timer
    const lastActivity = localStorage.getItem(STORAGE_KEY);
    const warningShown = localStorage.getItem(WARNING_STORAGE_KEY);
    
    if (warningShown) {
      warningShownRef.current = true;
    }

    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity);
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (timeSinceActivity >= TIMEOUT_DURATION) {
        // User has been inactive too long, logout immediately
        handleLogout();
        return;
      } else {
        // Set timer for remaining time
        const remainingTime = TIMEOUT_DURATION - timeSinceActivity;
        const remainingWarningTime = WARNING_THRESHOLD - timeSinceActivity;
        
        if (remainingWarningTime <= 0 && !warningShownRef.current) {
          showWarning();
        } else if (remainingWarningTime > 0) {
          warningTimeoutRef.current = setTimeout(showWarning, remainingWarningTime);
        }
        
        timeoutRef.current = setTimeout(handleLogout, remainingTime);
      }
    } else {
      // No previous activity, start fresh timer
      resetActivityTimer();
    }

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearActivityTimeout();
    };
  }, [isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearActivityTimeout();
    };
  }, []);
}