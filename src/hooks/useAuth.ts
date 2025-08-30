import { useState, useEffect, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isProcessingMagicLink: boolean;
};

/**
 * Optimized auth hook - faster processing with UX protection
 */
export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const hasTokens = 
      window.location.hash.includes('access_token') || 
      window.location.search.includes('access_token');
    
    return {
      user: null,
      session: null,
      isAuthenticated: hasTokens,
      isLoading: true,
      isProcessingMagicLink: hasTokens,
    };
  });

  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initAuth = async () => {
      try {
        const hasTokens = 
          window.location.hash.includes('access_token') || 
          window.location.search.includes('access_token');
        
        if (hasTokens) {
          console.log('[useAuth] Processing magic link...');
          
          // OPTIMIZED: Shorter delay but with minimum UX time
          const startTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced to 200ms
          
          // Check session repeatedly until ready (up to 3 seconds total)
          let session = null;
          let attempts = 0;
          const maxAttempts = 15; // 15 * 200ms = 3 seconds max
          
          while (attempts < maxAttempts && !session) {
            const { data } = await supabase.auth.getSession();
            session = data.session;
            
            if (!session) {
              await new Promise(resolve => setTimeout(resolve, 200));
              attempts++;
            }
          }
          
          // Ensure minimum loader time for UX (400ms total minimum)
          const elapsed = Date.now() - startTime;
          if (elapsed < 400) {
            await new Promise(resolve => setTimeout(resolve, 400 - elapsed));
          }
          
          if (mountedRef.current) {
            setAuthState({
              user: session?.user ?? null,
              session,
              isAuthenticated: !!session,
              isLoading: false,
              isProcessingMagicLink: false,
            });
          }
          return; // Skip the regular session check
        }
        
        // Regular auth check for non-magic-link scenarios
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mountedRef.current) {
          setAuthState({
            user: session?.user ?? null,
            session,
            isAuthenticated: !!session,
            isLoading: false,
            isProcessingMagicLink: false,
          });
        }
      } catch (error) {
        console.error('[useAuth] Auth initialization failed:', error);
        if (mountedRef.current) {
          setAuthState({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            isProcessingMagicLink: false,
          });
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;
        
        console.log('[useAuth] Auth event:', event, session?.user?.email);
        
        setAuthState({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
          isLoading: false,
          isProcessingMagicLink: false,
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