import React, { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;

          setUser(user as User);
          setSession(session as Session);
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error("Error loading session:", error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (currentSession) {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user as User);
          setSession(currentSession as Session);
        } else {
          setUser(null);
          setSession(null);
        }
        if (event === "SIGNED_OUT") {
          router.push("/auth/login");
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setSession(session as Session);
    } catch (error) {
      console.error("Refresh error:", error);
      await signOut();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signOut, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = (WrappedComponent: React.ComponentType) => {
  return function ProtectedRoute(props: any) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push("/auth/login");
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};
