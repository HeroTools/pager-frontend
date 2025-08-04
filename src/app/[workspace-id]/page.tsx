'use client';

import { Loader, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { WorkspaceSidebar } from '@/components/side-nav/workspace-sidebar';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useCreateChannelModal } from '@/features/channels/store/use-create-channel-modal';
import { useCurrentMember } from '@/features/members/hooks/use-members';
import { useGetWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId() as string;
  const { open, setOpen } = useCreateChannelModal();
  const isMobile = useIsMobile();

  const {
    data: currentMember,
    isLoading: isMemberLoading,
    error: memberError,
  } = useCurrentMember(workspaceId);
  const {
    data: workspace,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
  } = useGetWorkspace(workspaceId);
  const {
    data: channels,
    isLoading: isChannelsLoading,
    error: channelsError,
  } = useGetUserChannels(workspaceId);

  const channelId = useMemo(() => channels?.[0]?.id, [channels]);

  const isAdmin = useMemo(() => {
    return currentMember?.role === 'admin';
  }, [currentMember]);

  const isLoading = isWorkspaceLoading || isChannelsLoading || isMemberLoading;
  const hasError = workspaceError || channelsError || memberError;

  useEffect(() => {
    if (isLoading || !workspace || !currentMember) {
      return;
    }

    // Only redirect to channel on desktop
    if (!isMobile && channelId) {
      router.push(`/${workspaceId}/c-${channelId}`);
    } else if (!isMobile && !open && isAdmin) {
      setOpen(true);
    }
  }, [isLoading, workspace, currentMember, isAdmin, channelId, open, setOpen, router, workspaceId, isMobile]);

  if (isLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !workspace || !currentMember) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {hasError ? 'Error loading workspace' : 'Workspace not found'}
        </span>
      </div>
    );
  }

  // On mobile, show the workspace sidebar as the home screen
  if (isMobile) {
    return (
      <div className="h-full overflow-y-auto">
        <WorkspaceSidebar />
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
