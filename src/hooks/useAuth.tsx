import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    // Load session from localStorage on mount
    const loadSession = () => {
      try {
        const storedSession = localStorage.getItem("supabase-session");
        const storedProfile = localStorage.getItem("user-profile");

        if (storedSession && storedProfile) {
          setSession(JSON.parse(storedSession));
          setUser(JSON.parse(storedProfile));
        }
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signOut = async () => {
    try {
      // Call your sign out API
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem("supabase-session");
      localStorage.removeItem("user-profile");
      setUser(null);
      setSession(null);
      router.push("/auth/login");
    }
  };

  const refreshSession = async () => {
    if (!session?.refresh_token) return;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSession(result.data.session);
        localStorage.setItem(
          "supabase-session",
          JSON.stringify(result.data.session)
        );
      } else {
        // Refresh failed, sign out
        await signOut();
      }
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
