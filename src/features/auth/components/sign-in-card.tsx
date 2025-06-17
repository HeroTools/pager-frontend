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
import { SignInFlow } from "../types";
import { useSignIn, useGoogleSignIn, useGithubSignIn } from "@/features/auth";

interface SignInCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignInCard = ({ setState }: SignInCardProps) => {
  const signIn = useSignIn();
  const googleSignIn = useGoogleSignIn();
  const githubSignIn = useGithubSignIn();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handlePasswordSignIn = form.handleSubmit(
    async ({ email, password }) => {
      signIn.mutate({ email, password });
    }
  );

  const handleGoogleSignIn = async () => {
    googleSignIn.mutate({
      redirectTo: `${window.location.origin}/auth/callback`,
    });
  };

  const handleGithubSignIn = async () => {
    githubSignIn.mutate({
      redirectTo: `${window.location.origin}/auth/callback`,
    });
  };

  // Get loading state from any of the mutations
  const isLoading =
    signIn.isPending || googleSignIn.isPending || githubSignIn.isPending;

  // Get error from the most recent mutation
  const error = signIn.error || googleSignIn.error || githubSignIn.error;

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
          <p>{error.message}</p>
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
          >
            {signIn.isPending ? "Signing in..." : "Continue"}
          </Button>
        </form>
        <Separator />
        <div className="flex flex-col gap-y-2.5">
          <Button
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            variant="outline"
            size="lg"
            className="w-full relative"
          >
            <FcGoogle className="size-5 absolute top-3 left-2.5" />
            {googleSignIn.isPending ? "Connecting..." : "Continue with Google"}
          </Button>
          <Button
            disabled={isLoading}
            onClick={handleGithubSignIn}
            variant="outline"
            size="lg"
            className="w-full relative"
          >
            <FaGithub className="size-5 absolute top-3 left-2.5" />
            {githubSignIn.isPending ? "Connecting..." : "Continue with Github"}
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
