import { useState } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { TriangleAlert, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SignInFlow } from "../types";
import { authApi } from "@/features/auth/api/auth-api";
import { useSignUp } from "@/features/auth";

interface SignUpCardProps {
  setState: (state: SignInFlow) => void;
  hideSignInLink?: boolean;
}

export const SignUpCard = ({ setState, hideSignInLink = false }: SignUpCardProps) => {
  const signUp = useSignUp();
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handlePasswordSignUp = form.handleSubmit(
    async ({ name, email, password, confirmPassword }) => {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setSigningUp(true);
      setError("");

      try {
        const response = await signUp.mutateAsync({ email, password, name });

        console.log("Sign up response:", response);

        if (response.success) {
          // Check if email confirmation is required
          if (response.data.session) {
            // User is immediately signed in (email confirmed)
            await supabase.auth.setSession({
              access_token: response.data.session.accessToken,
              refresh_token: response.data.session.refreshToken,
            });

            router.push("/");
            router.refresh();
          } else {
            // Email confirmation required
            setUserEmail(email);
            setEmailSent(true);
          }
        } else {
          setError(response.error || "Failed to sign up");
        }
      } catch (err: any) {
        console.error("Sign up error:", err);
        setError(
          err.response?.data?.error || "Something went wrong. Please try again."
        );
      } finally {
        setSigningUp(false);
      }
    }
  );

  const handleProviderSignUp = (provider: "google") => async () => {
    if (provider !== "google") {
      setError("Unsupported sign-in method. Please use Google to sign up.");
      return;
    }
    setSigningUp(true);
    setError("");

    try {
      const response = await authApi.googleSignIn(`${window.location.origin}/auth/callback`);
      // Redirect to OAuth provider if url exists
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      console.error(`${provider} sign up error:`, err);
      setError(
        err.response?.data?.error ||
          `Failed to sign up with ${provider}. Please try again.`
      );
      setSigningUp(false);
    }
  };

  const handleResendEmail = async () => {
    if (!userEmail) return;

    setSigningUp(true);
    setError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: userEmail,
      });

      if (error) {
        setError(error.message);
      } else {
        setError("");
        // Could show a success message here
      }
    } catch (err: any) {
      setError("Failed to resend email. Please try again.");
    } finally {
      setSigningUp(false);
    }
  };

  // Show email confirmation screen
  if (emailSent) {
    return (
      <Card className="w-full h-full p-8">
        <CardHeader className="px-0 pt-0 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="size-12 text-brand-green" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent a confirmation link to <strong>{userEmail}</strong>
          </CardDescription>
        </CardHeader>
        {error && (
          <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
            <TriangleAlert className="size-4" />
            <p>{error}</p>
          </div>
        )}
        <CardContent className="space-y-4 px-0 pb-0 text-center">
          <p className="text-sm text-muted-foreground">
            Click the link in the email to verify your account. If you don't see
            it, check your spam folder.
          </p>
          <div className="space-y-2">
            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="w-full"
              disabled={signingUp}
            >
              {signingUp ? "Sending..." : "Resend email"}
            </Button>
            <Button
              onClick={() => {
                setEmailSent(false);
                setUserEmail("");
                setError("");
              }}
              variant="ghost"
              className="w-full"
            >
              Back to sign up
            </Button>
          </div>
          {!hideSignInLink && (
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <span
                className="text-primary hover:underline cursor-pointer"
                onClick={() => setState("signIn")}
              >
                Sign in
              </span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full p-8">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Sign up to continue</CardTitle>
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
        <form className="space-y-2.5" onSubmit={handlePasswordSignUp}>
          <Input
            {...form.register("name", {
              required: "Name is required",
            })}
            disabled={signingUp}
            placeholder="Full name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
          <Input
            {...form.register("email", {
              required: "Email is required",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Please enter a valid email",
              },
            })}
            disabled={signingUp}
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
            disabled={signingUp}
            placeholder="Password"
            type="password"
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
          <Input
            {...form.register("confirmPassword", {
              required: "Please confirm your password",
            })}
            disabled={signingUp}
            placeholder="Confirm password"
            type="password"
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={signingUp}
          >
            {signingUp ? "Signing up..." : "Continue"}
          </Button>
        </form>
        <Separator />
        <div className="flex flex-col gap-y-2.5">
          <Button
            disabled={signingUp}
            onClick={handleProviderSignUp("google")}
            variant="outline"
            size="lg"
            className="w-full relative"
          >
            <span className="size-5 absolute top-3 left-2.5">G</span>
            Continue with Google
          </Button>
        </div>
        {!hideSignInLink && (
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <span
              className="text-primary hover:underline cursor-pointer"
              onClick={() => setState("signIn")}
            >
              Sign in
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

function isApiError(err: unknown): err is { response: { data?: { error?: string } } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as any).response === 'object' &&
    (err as any).response !== null
  );
}
