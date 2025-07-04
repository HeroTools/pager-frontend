"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session from Supabase
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Authentication failed");
          return;
        }

        if (session) {
          // Check if user profile exists in your database
          const { data: userProfile, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          // If profile doesn't exist, create it
          if (!userProfile && profileError?.code === "PGRST116") {
            const { error: insertError } = await supabase.from("users").insert({
              id: session.user.id,
              email: session.user.email || "",
              name: session.user.user_metadata?.name || "User",
              image: session.user.user_metadata?.avatar_url || null,
            });

            if (insertError) {
              console.error("Profile creation error:", insertError);
              setError("Failed to create user profile");
              return;
            }

            // Get the newly created profile
            const { data: newProfile } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();

            // Store session and profile
            localStorage.setItem("supabase-session", JSON.stringify(session));
            localStorage.setItem("user-profile", JSON.stringify(newProfile));
          } else if (userProfile) {
            // Store existing session and profile
            localStorage.setItem("supabase-session", JSON.stringify(session));
            localStorage.setItem("user-profile", JSON.stringify(userProfile));
          } else {
            console.error("Profile fetch error:", profileError);
            setError("Failed to load user profile");
            return;
          }

          // Redirect to dashboard
          router.push("/");
        } else {
          // No session found, redirect to login
          router.push("/auth/login?error=no_session");
        }
      } catch (err) {
        console.error("Callback error:", err);
        setError("Something went wrong during authentication");
      } finally {
        setLoading(false);
      }
    };

    // Small delay to ensure URL parameters are available
    const timer = setTimeout(handleAuthCallback, 100);

    return () => clearTimeout(timer);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Completing sign in...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="bg-destructive border border-destructive rounded-lg p-6">
                <h2 className="text-lg font-semibold text-destructive mb-2">
                  Authentication Error
                </h2>
                <p className="text-destructive mb-4">{error}</p>
                <button
                  onClick={() => router.push("/auth/login")}
                  className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/80 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
