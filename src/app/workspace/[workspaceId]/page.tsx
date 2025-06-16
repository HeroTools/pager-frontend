"use client";

import { Loader, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useGetChannels } from "@/features/channels/api/useGetChannels";
import { useCreateChannelModal } from "@/features/channels/store/useCreateChannelModal";
import { useCurrentMember } from "@/features/members/api/useCurrentMember";
import { useGetWorkspace } from "@/features/workspaces/api/useGetWorkspace";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { open, setOpen } = useCreateChannelModal();
  const currentMember = useCurrentMember({ workspaceId });
  const getWorkspace = useGetWorkspace({ id: workspaceId });
  const getChannels = useGetChannels({ workspaceId });

  const channelId = useMemo(
    () => getChannels.data?.[0]?._id,
    [getChannels.data]
  );

  const isAdmin = useMemo(
    () => currentMember.data?.role === "admin",
    [currentMember.data?.role]
  );

  useEffect(() => {
    if (
      getWorkspace.isLoading ||
      getChannels.isLoading ||
      currentMember.isLoading ||
      !getWorkspace.data ||
      !currentMember.data
    ) {
      return;
    }
    if (channelId) {
      router.push(`/workspace/${workspaceId}/channel/${channelId}`);
    } else if (!open && isAdmin) {
      setOpen(true);
    }
  }, [
    getWorkspace,
    getChannels.isLoading,
    currentMember.isLoading,
    currentMember.data,
    isAdmin,
    channelId,
    open,
    setOpen,
    router,
    workspaceId,
  ]);

  if (getWorkspace.isLoading || getChannels.isLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!getWorkspace.data || !currentMember.data) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Workspace not found
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
      <TriangleAlert className="size-6 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">No channel found</span>
    </div>
  );
};

export default WorkspaceIdPage;
