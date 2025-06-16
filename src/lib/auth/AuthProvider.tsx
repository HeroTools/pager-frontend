/**
 * Authentication Context Provider
 * 
 * This component provides authentication state and methods throughout the application.
 * It uses Supabase Auth and React Context to manage:
 * - Current user session
 * - User information
 * - Loading states
 * - Sign out functionality
 * 
 * The provider automatically:
 * - Initializes the session on mount
 * - Listens for auth state changes
 * - Updates the context when auth state changes
 * 
 * Usage:
 * ```typescript
 * import { useAuth } from '@/lib/auth/AuthProvider';
 * 
 * function MyComponent() {
 *   const { user, session, loading, signOut } = useAuth();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please log in</div>;
 *   
 *   return <div>Welcome, {user.email}</div>;
 * }
 * ```
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "../supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the auth context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 