"use client";

import Image from "next/image";
import Link from "next/link";
import VerificationInput from "react-verification-input";

import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useGetWorkspaceInfo } from "@/features/workspaces/api/useGetWorkspaceInfo";
import { Loader } from "lucide-react";
import { useJoin } from "@/features/workspaces/api/useJoin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const JoinPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { isLoading, data: workspaceInfo } = useGetWorkspaceInfo({ id: workspaceId });
  const join = useJoin();

  useEffect(() => {
    if (workspaceInfo?.isMember) {
      router.push(`/workspace/${workspaceId}`);
    }
  }, [workspaceInfo?.isMember, router, workspaceId]);

  const handleComplete = (value: string) => {
    join
      .mutateAsync({
        joinCode: value,
        workspaceId,
      })
      .then(() => {
        router.replace(`/workspace/${workspaceId}`);
        toast.success("Workspace joined");
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to join workspace");
      });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-y-8 items-center justify-center bg-white p-8 rounded-lg shadow-sm">
      <Image src="/logo.svg" width={60} height={60} alt="Logo" />
      <div className="flex flex-col gap-y-4 items-center justify-center max-w-md">
        <div className="flex flex-col gap-y-2 items-center justify-center">
          <h1 className="text-2xl font-bold">Join {workspaceInfo?.name}</h1>
          <p className="text-md text-muted-foreground">
            Enter the workspace code to join
          </p>
        </div>
        <VerificationInput
          length={6}
          classNames={{
            container: cn(
              "flex gap-x-2",
              join.isPending && "opacity-50 cursor-not-allowed"
            ),
            character:
              "uppercase h-auto rounded-md border border-ray-300 flex items-center justify-center text-lg font-medium text-gray-500",
            characterInactive: "bg-muted",
            characterSelected: "bg-white text-black",
            characterFilled: "bg-white text-black",
          }}
          autoFocus
          onComplete={handleComplete}
        />
      </div>
      <div className="flex gap-x-4">
        <Button size="lg" variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default JoinPage;
