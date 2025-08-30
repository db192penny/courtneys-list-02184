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
 * Simplified auth hook that waits for session to be fully established
 */
export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      });
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Add a small delay to ensure session is fully propagated
        if (_event === 'SIGNED_IN') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setAuthState({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
          isLoading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}