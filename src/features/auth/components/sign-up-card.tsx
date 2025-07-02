import { useState } from "react";
import { useForm } from "react-hook-form";
import { TriangleAlert, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient, supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { SignInFlow } from "../types";
import { authApi } from "@/features/auth/api/auth-api";
import { useSignUp } from "@/features/auth";

interface SignUpCardProps {
  onSuccess?: (workspaceId?: string) => void;
  setState: (state: SignInFlow) => void;
  hideSignInLink?: boolean;
  inviteToken?: string;
}

export const SignUpCard = ({
  onSuccess,
  setState,
  hideSignInLink = false,
  inviteToken,
}: SignUpCardProps) => {
  const signUp = useSignUp();
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

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
        const response = await signUp.mutateAsync({
          email,
          password,
          name,
          inviteToken,
        });

        if (response.requires_email_confirmation) {
          setUserEmail(email);
          setEmailSent(true);
          return;
        }

        if (response.session) {
          await supabase.auth.setSession(response.session);
        }

        if (onSuccess) {
          onSuccess(response.workspace?.id);
        } else if (response.workspace?.id) {
          router.push(`/${response.workspace.id}`);
          router.refresh();
        } else {
          router.push("/");
          router.refresh();
        }
      } catch (err: any) {
        const error: any = err;
        if (error instanceof Error) {
          setError(error.message);
        } else if (error && typeof error === "object" && "response" in error) {
          const response: any = error.response;
          if (response && response.data) {
            const data: any = response.data;
            if (data.error) {
              setError(data.error);
            } else {
              setError("Something went wrong. Please try again.");
            }
          } else {
            setError("Something went wrong. Please try again.");
          }
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setSigningUp(false);
      }
    }
  );



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
          </div>
          {!hideSignInLink && (
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <span className="text-primary hover:underline cursor-pointer">
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
        {!hideSignInLink && (
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <span
              onClick={() => setState("signIn")}
              className="text-primary hover:underline cursor-pointer"
            >
              Sign in
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
