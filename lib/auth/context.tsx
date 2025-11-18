import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "./supabase-client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

/**
 * AuthProvider component that manages authentication state
 * Provides user, session, and auth methods to child components
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    console.log('[AuthProvider] useEffect running');
    
    // Don't prevent re-initialization - we need to check auth state on every mount
    // This ensures auth state is checked after login/signup redirects
    
    try {
      const supabase = createClient();
      console.log('[AuthProvider] Supabase client created');

      // Get initial authenticated user - getUser() verifies with Supabase Auth server
      supabase.auth.getUser().then(({ data: { user }, error }) => {
        console.log('[AuthProvider] getUser result:', { hasUser: !!user, error: error?.message });
        if (!mounted) {
          console.log('[AuthProvider] Component unmounted, skipping state update');
          return;
        }
        
        // If there's an error (e.g., invalid env vars), just set loading to false
        if (error) {
          console.warn('[AuthProvider] Auth error:', error);
          setIsLoading(false);
          return;
        }
        
        // For client-side, we still need session for some features
        // So we get the session after verifying the user
        if (user) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[AuthProvider] Session retrieved:', { hasSession: !!session });
            if (!mounted) return;
            setSession(session);
            setUser(user);
            setIsLoading(false);
          }).catch((err) => {
            if (!mounted) return;
            console.warn('[AuthProvider] Session error:', err);
            setIsLoading(false);
          });
        } else {
          console.log('[AuthProvider] No user, setting null state');
          setSession(null);
          setUser(null);
          setIsLoading(false);
        }
      }).catch((err) => {
        if (!mounted) return;
        console.warn('[AuthProvider] Auth getUser error:', err);
        setIsLoading(false);
      });

      // Listen for auth changes
      // Note: onAuthStateChange provides session which is fine for reactivity
      // The initial getUser() ensures we start with verified user data
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthProvider] Auth state changed:', event, { hasSession: !!session });
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });

      return () => {
        console.log('[AuthProvider] Cleanup running');
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('[AuthProvider] Initialization error:', error);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * Returns user, session, loading state, and signOut function
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook to access the current user
 * Returns user object and loading state
 */
export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

/**
 * Hook to access the current session
 * Returns session object and loading state
 */
export function useSession() {
  const { session, isLoading } = useAuth();
  return { session, isLoading };
}

