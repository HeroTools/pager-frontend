"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

import { useJoinWorkspace } from "@/features/workspaces/hooks/use-workspaces";
import { SignUpCard } from "@/features/auth/components/sign-up-card";

const JoinPage = () => {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params["workspace-id"] as string;
  const joinCode = params["join-code"] as string;

  const join = useJoinWorkspace();
  const [step, setStep] = useState<"signup" | "joining" | "joined">("signup");

  // Handler for after authentication (sign up or sign in)
  const handleAuthSuccess = async () => {
    if (!workspaceId || !joinCode) {
      toast.error("Workspace ID or join code is missing from the URL");
      return;
    }
    setStep("joining");
    join
      .mutateAsync({ join_code: joinCode, workspace_id: workspaceId })
      .then(() => {
        setStep("joined");
        router.replace(`/${workspaceId}`);
        toast.success("Workspace joined");
      })
      .catch((error) => {
        if (typeof error === 'object' && error && 'message' in error) {
          console.error((error as { message: string }).message);
        } else {
          console.error(error);
        }
        toast.error("Failed to join workspace");
        setStep("signup");
      });
  };

  return (
    <div className="h-full flex flex-col gap-y-8 items-center justify-center p-8 rounded-lg shadow-sm bg-background">
      <Image src="/logo.svg" width={60} height={60} alt="Logo" />
      <div className="flex flex-col gap-y-4 items-center justify-center max-w-md">
        <div className="flex flex-col gap-y-2 items-center justify-center">
          <h1 className="text-2xl font-bold">Join Workspace</h1>
          <p className="text-md text-muted-foreground">
            {step === "signup"
              ? "Create an account to join this workspace."
              : step === "joining"
              ? "Joining workspace..."
              : "Redirecting..."}
          </p>
        </div>
        {step === "signup" && (
          <div className="w-full flex flex-col items-center gap-y-4">
            <SignUpCard setState={handleAuthSuccess} hideSignInLink />
          </div>
        )}
        {step === "joining" && (
          <div className="w-full flex flex-col items-center gap-y-4">
            <Loader className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinPage;
