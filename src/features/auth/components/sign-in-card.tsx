import { useForm } from "react-hook-form";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { SignInFlow } from "../types";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/client";

interface SignInCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignInCard = ({ setState }: SignInCardProps) => {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handlePasswordSignIn = form.handleSubmit(
    async ({ email, password }) => {
      setSigningIn(true);
      setError("");

      try {
        const response = await authApi.signIn({ email, password });
        const result = response.data;

        if (result.success) {
          // IMPORTANT: Set the session with Supabase client to propagate to cookies
          await supabase.auth.setSession({
            access_token: result.data.session.accessToken,
            refresh_token: result.data.session.refreshToken,
          });

          // Redirect to dashboard or intended page
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(result.error || "Invalid email or password");
        }
      } catch (err: any) {
        console.error("Sign in error:", err);
        setError(err.response?.data?.error || "Something went wrong. Please try again.");
      } finally {
        setSigningIn(false);
      }
    }
  );

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError("");

    try {
      const response = await authApi.googleSignIn(
        `${window.location.origin}/auth/callback`
      );

      const result = response.data;

      // Redirect to Google OAuth
      window.location.href = result.url;
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.response?.data?.error || "Failed to sign in with Google. Please try again.");
      setSigningIn(false);
    }
  };

  const handleGithubSignIn = async () => {
    setSigningIn(true);
    setError("");

    try {
      // If you implement GitHub OAuth later
      const response = await authApi.githubSignIn(
        `${window.location.origin}/auth/callback`
      );

      const result = response.data;

      window.location.href = result.url;
    } catch (err: any) {
      console.error("GitHub sign in error:", err);
      setError(err.response?.data?.error || "GitHub sign in is not available yet.");
      setSigningIn(false);
    }
  };

  return (
    <Card className="w-full h-full p-8">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Login to continue</CardTitle>
        <CardDescription>
          Use your email or another service to continue
        </CardDescription>
      </CardHeader>
      {error && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
          <TriangleAlert className="size-4" />
          <p>{error}</p>
        </div>
      )}
      <CardContent className="space-y-5 px-0 pb-0">
        <form className="space-y-2.5" onSubmit={handlePasswordSignIn}>
          <Input
            {...form.register("email", {
              required: "Email is required",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Please enter a valid email",
              },
            })}
            disabled={signingIn}
            placeholder="Email"
            type="email"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
          <Input
            {...form.register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            disabled={signingIn}
            placeholder="Password"
            type="password"
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={signingIn}
          >
            {signingIn ? "Signing in..." : "Continue"}
          </Button>
        </form>
        <Separator />
        <div className="flex flex-col gap-y-2.5">
          <Button
            disabled={signingIn}
            onClick={handleGoogleSignIn}
            variant="outline"
            size="lg"
            className="w-full relative"
          >
            <FcGoogle className="size-5 absolute top-3 left-2.5" />
            Continue with Google
          </Button>
          <Button
            disabled={signingIn}
            onClick={handleGithubSignIn}
            variant="outline"
            size="lg"
            className="w-full relative"
          >
            <FaGithub className="size-5 absolute top-3 left-2.5" />
            Continue with Github
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <span
            className="text-sky-700 hover:underline cursor-pointer"
            onClick={() => setState("signUp")}
          >
            Sign up
          </span>
        </p>
      </CardContent>
    </Card>
  );
};
