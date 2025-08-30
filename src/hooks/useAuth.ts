import { useState, useEffect, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

/**
 * Race condition-safe auth hook optimized for magic links
 * Prevents logout after successful magic link authentication
 */
export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Stay optimistic if we see magic link tokens
    const hasTokens = window.location.hash.includes('access_token') || 
                     window.location.search.includes('access_token');
    
    return {
      user: null,
      session: null,
      isAuthenticated: hasTokens, // Optimistic for magic links
      isLoading: true,
    };
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const initAuth = async () => {
      try {
        // If we have tokens, give Supabase time to process them first
        const hasTokens = window.location.hash.includes('access_token') || 
                         window.location.search.includes('access_token');
        
        if (hasTokens) {
          // Brief pause to let Supabase exchange tokens for session
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (mountedRef.current) {
          setAuthState({
            user: session?.user ?? null,
            session,
            isAuthenticated: !!session,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mountedRef.current) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initAuth();

    // Listen for auth changes with race condition protection
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;
        
        console.log('Auth event:', event, session?.user?.email);
        
        // Update state immediately for all events
        setAuthState({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
          isLoading: false,
        });
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return authState;
}