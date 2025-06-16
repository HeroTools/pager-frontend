import { useAuthActions } from "@convex-dev/auth/react";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
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
import { SignInFlow } from "../types";

interface SignUpCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignUpCard = ({ setState }: SignUpCardProps) => {
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState("");

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { signIn } = useAuthActions();

  const handlePasswordSignUp = form.handleSubmit(
    ({ name, email, password, confirmPassword }) => {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setSigningUp(true);
      signIn("password", { name, email, password, flow: "signUp" })
        .catch(() => {
          setError("Something went wrong!");
        })
        .finally(() => {
          setSigningUp(false);
        });
    }
  );

  const handleProviderSignUp = (value: "github" | "google") => () => {
    setSigningUp(true);
    signIn(value).finally(() => {
      setSigningUp(false);
    });
  };

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
              required: true,
            })}
            disabled={signingUp}
            placeholder="Full name"
          />
          <Input
            {...form.register("email", {
              required: true,
            })}
            disabled={signingUp}
            placeholder="Email"
            type="email"
          />
          <Input
            {...form.register("password", {
              required: true,
            })}
            disabled={signingUp}
            placeholder="Password"
            type="password"
          />
          <Input
            {...form.register("confirmPassword", {
              required: true,
            })}
            disabled={signingUp}
            placeholder="Confirm password"
            type="password"
          />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={signingUp}
          >
            Continue
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
            <FcGoogle className="size-5 absolute top-3 left-2.5" />
            Continue with Google
          </Button>
          <Button
            disabled={signingUp}
            onClick={handleProviderSignUp("github")}
            variant="outline"
            size="lg"
            className="w-full relative"
          >
            <FaGithub className="size-5 absolute top-3 left-2.5" />
            Continue with Github
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <span
            className="text-sky-700 hover:underline cursor-pointer"
            onClick={() => setState("signIn")}
          >
            Sign in
          </span>
        </p>
      </CardContent>
    </Card>
  );
};
