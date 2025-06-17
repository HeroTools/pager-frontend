"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { UserButton } from "@/features/auth/components/user-button";
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";

export default function CreateWorkspace() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/workspaces");
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center">
      <CreateWorkspaceModal />
      {/* <UserButton /> */}
    </div>
  );
}
