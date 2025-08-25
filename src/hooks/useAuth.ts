import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

/**
 * Session-first authentication hook that only checks Supabase auth state
 * This ensures that users with valid sessions are always considered authenticated,
 * regardless of database profile query results
 */
export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    let authListenerReady = false;
    let sessionCheckComplete = false;
    let refreshComplete = false;
    let latestAuthState: AuthState | null = null;

    const updateAuthState = (newState: Omit<AuthState, 'isLoading'>, source: string) => {
      console.log(`[useAuth] ${source}:`, { 
        hasSession: !!newState.session, 
        isAuthenticated: newState.isAuthenticated,
        authListenerReady,
        sessionCheckComplete,
        refreshComplete
      });
      
      latestAuthState = { ...newState, isLoading: true };
      
      // Only set loading to false when all operations are complete
      if (authListenerReady && sessionCheckComplete && refreshComplete && latestAuthState) {
        console.log("[useAuth] All operations complete, setting loading to false with latest state:", {
          hasSession: !!latestAuthState.session,
          isAuthenticated: latestAuthState.isAuthenticated
        });
        setAuthState({ ...latestAuthState, isLoading: false });
      }
    };

    // FIRST refresh session to ensure valid tokens (fixes Safari issues)
    supabase.auth.refreshSession().then(({ data: { session }, error }) => {
      refreshComplete = true;
      if (error) {
        console.warn("[useAuth] Session refresh failed (non-fatal):", error);
      } else {
        console.log("[useAuth] Session refreshed successfully");
      }
      // Trigger auth state update if we have other operations complete
      if (latestAuthState) {
        updateAuthState(latestAuthState, "After session refresh");
      }
    }).catch((error) => {
      refreshComplete = true;
      console.warn("[useAuth] Session refresh error (non-fatal):", error);
    });

    // Set up auth state listener SECOND
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authListenerReady = true;
        updateAuthState({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
        }, `Auth state changed: ${event}`);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionCheckComplete = true;
      updateAuthState({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
      }, "Initial session check");
    });

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}