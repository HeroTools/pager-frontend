"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { UserButton } from "@/features/auth/components/user-button";
import { useGetWorkspaces } from "@/features/workspaces";
import { useCreateWorkspaceModal } from "@/features/workspaces/store/use-create-workspace-modal";

export default function Home() {
  const router = useRouter();
  const { open, setOpen } = useCreateWorkspaceModal();
  const { isLoading, data: workspaces } = useGetWorkspaces();

  const workspaceId = useMemo(() => workspaces?.[0]?.id, [workspaces]);

  useEffect(() => {
    if (isLoading) return;

    if (workspaceId) {
      router.replace(`/${workspaceId}`);
    } else if (!open) {
      setOpen(true);
    }
  }, [workspaceId, isLoading, open, setOpen, router]);

  return (
    <div>
      <UserButton />
    </div>
  );
}
