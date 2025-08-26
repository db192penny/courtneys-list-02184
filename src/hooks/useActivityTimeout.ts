import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 25 * 60 * 1000; // 25 minutes
const ACTIVITY_THROTTLE = 60 * 1000; // 1 minute
const STORAGE_KEY = 'lastActivityTime';
const WARNING_STORAGE_KEY = 'activityWarningShown';

/**
 * Hook that automatically logs out users after 30 minutes of inactivity
 * Runs independently of useAuth to avoid interference with complex auth logic
 */
export function useActivityTimeout(isAuthenticated: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const lastThrottleRef = useRef<number>(0);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = undefined;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[ActivityTimeout] Auto-logout triggered');
    clearTimeouts();
    try {
      await supabase.auth.signOut();
      // Clear activity storage on logout
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(WARNING_STORAGE_KEY);
    } catch (error) {
      console.error('[ActivityTimeout] Logout error:', error);
    }
  }, [clearTimeouts]);

  const showWarning = useCallback(() => {
    const warningShown = localStorage.getItem(WARNING_STORAGE_KEY);
    if (warningShown) return;
    
    localStorage.setItem(WARNING_STORAGE_KEY, 'true');
    
    toast({
      title: "Session Timeout Warning",
      description: "You'll be logged out in 5 minutes due to inactivity.",
      duration: 300000, // Show for 5 minutes
    });
  }, []);

  const resetTimers = useCallback(() => {
    clearTimeouts();
    localStorage.removeItem(WARNING_STORAGE_KEY);
    
    // Set warning at 25 minutes
    warningTimeoutRef.current = setTimeout(showWarning, WARNING_TIME);
    
    // Set logout at 30 minutes
    timeoutRef.current = setTimeout(logout, TIMEOUT_DURATION);
  }, [clearTimeouts, showWarning, logout]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    
    // Throttle activity updates to once per minute for performance
    if (now - lastThrottleRef.current < ACTIVITY_THROTTLE) {
      return;
    }
    
    lastThrottleRef.current = now;
    localStorage.setItem(STORAGE_KEY, now.toString());
    resetTimers();
  }, [resetTimers]);

  const handleActivity = useCallback(() => {
    if (!isAuthenticated) return;
    updateActivity();
  }, [isAuthenticated, updateActivity]);

  const checkCrossTabActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const lastActivity = localStorage.getItem(STORAGE_KEY);
    if (!lastActivity) return;
    
    const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
    
    if (timeSinceActivity >= TIMEOUT_DURATION) {
      // Auto-logout if enough time has passed
      logout();
    } else if (timeSinceActivity >= WARNING_TIME) {
      // Show warning if we're in warning period
      const remainingTime = TIMEOUT_DURATION - timeSinceActivity;
      warningTimeoutRef.current = setTimeout(logout, remainingTime);
      
      if (!localStorage.getItem(WARNING_STORAGE_KEY)) {
        showWarning();
      }
    } else {
      // Reset timers based on remaining time
      const remainingWarningTime = WARNING_TIME - timeSinceActivity;
      const remainingLogoutTime = TIMEOUT_DURATION - timeSinceActivity;
      
      if (remainingWarningTime > 0) {
        warningTimeoutRef.current = setTimeout(showWarning, remainingWarningTime);
      }
      
      timeoutRef.current = setTimeout(logout, remainingLogoutTime);
    }
  }, [isAuthenticated, logout, showWarning]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeouts();
      return;
    }

    console.log('[ActivityTimeout] Starting activity monitoring');

    // Initialize or check existing activity
    const lastActivity = localStorage.getItem(STORAGE_KEY);
    if (!lastActivity) {
      updateActivity(); // First time setup
    } else {
      checkCrossTabActivity(); // Sync with other tabs
    }

    // Activity event listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for cross-tab activity updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        console.log('[ActivityTimeout] Cross-tab activity detected');
        checkCrossTabActivity();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('[ActivityTimeout] Cleaning up activity monitoring');
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearTimeouts();
    };
  }, [isAuthenticated, handleActivity, updateActivity, checkCrossTabActivity, clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);
}