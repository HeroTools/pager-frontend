"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { SignUpCard } from "@/features/auth/components/sign-up-card";
import { useWorkspaceFromInviteToken } from "@/features/workspaces/hooks/use-workspaces";

const RegisterPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitation = searchParams.get("invitation");
  const [step, setStep] = useState<"signup" | "joining" | "joined">("signup");

  // Fetch workspace info from invite token
  const {
    data: inviteInfo,
    isLoading: inviteLoading,
    error: inviteError,
  } = useWorkspaceFromInviteToken(invitation || undefined);

  // Handler for after authentication (sign up or sign in)
  const handleAuthSuccess = async () => {
    // if (!invitation) {
    //   toast.error("Invitation token is missing from the URL");
    //   return;
    // }
    // setStep("joining");
    // join
    //   .mutateAsync({ invitation_token: invitation })
    //   .then((result: any) => {
    //     setStep("joined");
    //     // If the backend returns workspace_id, redirect to it
    //     if (result?.id) {
    //       router.replace(`/${result.id}`);
    //     } else {
    //       router.replace("/");
    //     }
    //     toast.success("Workspace joined");
    //   })
    //   .catch((error) => {
    //     if (typeof error === "object" && error && "message" in error) {
    //       console.error((error as { message: string }).message);
    //     } else {
    //       console.error(error);
    //     }
    //     toast.error("Failed to join workspace");
    //     setStep("signup");
    //   });
  };

  return (
    <div className="h-full flex flex-col gap-y-8 items-center justify-center p-8 rounded-lg shadow-sm bg-background">
      <Image src="/logo.svg" width={60} height={60} alt="Logo" />
      <div className="flex flex-col gap-y-4 items-center justify-center max-w-md">
        {/* Workspace info from invite token */}
        {inviteLoading ? (
          <Loader className="size-6 animate-spin text-muted-foreground" />
        ) : inviteError ? (
          <div className="text-destructive text-center">
            Invalid or expired invitation link.
          </div>
        ) : inviteInfo?.workspace ? (
          <div className="flex flex-col items-center gap-y-2">
            {inviteInfo.workspace.image && (
              <Image
                src={inviteInfo.workspace.image}
                width={48}
                height={48}
                alt="Workspace"
                className="rounded-full border"
              />
            )}
            <h2 className="text-xl font-semibold">{inviteInfo.workspace.name}</h2>
          </div>
        ) : null}
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
        {step === "signup" && !inviteLoading && !inviteError && inviteInfo?.workspace && (
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

export default RegisterPage; 