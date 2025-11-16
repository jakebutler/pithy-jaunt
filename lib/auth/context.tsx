"use client";

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
    const supabase = createClient();

    // Get initial authenticated user - getUser() verifies with Supabase Auth server
    supabase.auth.getUser().then(({ data: { user } }) => {
      // For client-side, we still need session for some features
      // So we get the session after verifying the user
      if (user) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(user);
          setIsLoading(false);
        });
      } else {
        setSession(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    // Note: onAuthStateChange provides session which is fine for reactivity
    // The initial getUser() ensures we start with verified user data
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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

