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
          
          // CRITICAL FIX: Extract and process tokens manually
          const startTime = Date.now();
          
          // Give Supabase a moment to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Extract tokens from URL
          console.log('[useAuth] Current URL hash:', window.location.hash);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          console.log('[useAuth] Found tokens:', { 
            hasAccess: !!accessToken, 
            hasRefresh: !!refreshToken,
            accessLength: accessToken?.length,
            refreshLength: refreshToken?.length
          });
          
          if (accessToken && refreshToken) {
            console.log('[useAuth] Setting session with tokens...');
            
            // Manually set the session with the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('[useAuth] Failed to set session:', error);
              // Clear the URL to prevent retry
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } else if (data?.session) {
              console.log('[useAuth] Session set successfully');
              // Clear the URL after successful processing
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
          
          // Now check for the session
          const { data: { session } } = await supabase.auth.getSession();
          
          // Ensure minimum loader time for better UX (3 seconds total)
          const elapsed = Date.now() - startTime;
          if (elapsed < 3000) {
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