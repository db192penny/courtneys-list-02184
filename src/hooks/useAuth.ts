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

    const updateAuthState = (newState: Omit<AuthState, 'isLoading'>) => {
      latestAuthState = { ...newState, isLoading: true };
      
      // Only set loading to false when all operations are complete
      if (authListenerReady && sessionCheckComplete && refreshComplete && latestAuthState) {
        setAuthState({ ...latestAuthState, isLoading: false });
      }
    };

    // FIRST refresh session to ensure valid tokens (fixes Safari issues)
    supabase.auth.refreshSession().then(({ data: { session } }) => {
      refreshComplete = true;
      if (latestAuthState) {
        updateAuthState(latestAuthState);
      }
    }).catch(() => {
      refreshComplete = true;
    });

    // Set up auth state listener SECOND
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authListenerReady = true;
        updateAuthState({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
        });
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionCheckComplete = true;
      updateAuthState({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}
}