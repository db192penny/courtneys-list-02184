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
    let latestAuthState: AuthState | null = null;

    const updateAuthState = (newState: Omit<AuthState, 'isLoading'>, source: string) => {
      console.log(`[useAuth] ${source}:`, { 
        hasSession: !!newState.session, 
        isAuthenticated: newState.isAuthenticated,
        authListenerReady,
        sessionCheckComplete 
      });
      
      latestAuthState = { ...newState, isLoading: true };
      
      // Only set loading to false when both operations are complete
      if (authListenerReady && sessionCheckComplete) {
        console.log("[useAuth] Both operations complete, setting loading to false");
        setAuthState({ ...newState, isLoading: false });
      }
    };

    // Set up auth state listener FIRST
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