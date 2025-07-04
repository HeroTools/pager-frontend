'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth');
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      router.push('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (session) {
        setUser(session.user);
        setSession(session);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      await signOut();
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    refreshSession,
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
