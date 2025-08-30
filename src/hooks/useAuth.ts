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
      isAuthenticated: false,
      isLoading: true,
      isProcessingMagicLink: hasTokens,
    };
  });
  
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const processingRef = useRef(false);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const initAuth = async () => {
      try {
        // Check if we have magic link tokens in the URL
        const hasTokens = 
          window.location.hash.includes('access_token') || 
          window.location.search.includes('access_token');
        
        if (hasTokens && !processingRef.current) {
          processingRef.current = true;
          console.log('[useAuth] Magic link detected, showing loader...');
          
          // Keep the loader visible for minimum 3 seconds
          const startTime = Date.now();
          
          // Let Supabase handle the tokens automatically
          // Just wait and check for the session
          let session = null;
          let attempts = 0;
          const maxAttempts = 30; // 30 * 100ms = 3 seconds max
          
          while (attempts < maxAttempts && !session) {
            const { data } = await supabase.auth.getSession();
            session = data.session;
            
            if (!session) {
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
            } else {
              console.log('[useAuth] Session established:', session.user?.email);
            }
          }
          
          // Ensure minimum loader time for better UX (3 seconds total)
          const elapsed = Date.now() - startTime;
          if (elapsed < 3000) {
            console.log(`[useAuth] Waiting ${3000 - elapsed}ms more for UX...`);
            await new Promise(resolve => setTimeout(resolve, 3000 - elapsed));
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
          
          processingRef.current = false;
          return;
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
        
        // Don't update state if we're processing a magic link
        // Let the initAuth function handle it
        if (processingRef.current) {
          console.log('[useAuth] Ignoring auth event during magic link processing');
          return;
        }
        
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