'use client';

import { WorkspaceSidebar } from '@/components/side-nav/workspace-sidebar';
import { Button } from '@/components/ui/button';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useCreateChannelModal } from '@/features/channels/store/use-create-channel-modal';
import { useConversationCreateStore } from '@/features/conversations/store/conversation-create-store';
import { useCurrentMember } from '@/features/members/hooks/use-members';
import { useGetWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { Loader, SquarePen, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId() as string;
  const { open, setOpen } = useCreateChannelModal();
  const { startConversationCreation } = useConversationCreateStore();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
  }, []);

  const {
    data: currentMember,
    isLoading: isMemberLoading,
    isFetching: isMemberFetching,
    error: memberError,
  } = useCurrentMember(workspaceId);
  const {
    data: workspace,
    isLoading: isWorkspaceLoading,
    isFetching: isWorkspaceFetching,
    error: workspaceError,
  } = useGetWorkspace(workspaceId);
  const {
    data: channels,
    isLoading: isChannelsLoading,
    isFetching: isChannelsFetching,
    error: channelsError,
  } = useGetUserChannels(workspaceId);

  const channelId = useMemo(() => channels?.[0]?.id, [channels]);

  const isAdmin = useMemo(() => {
    return currentMember?.role === 'admin';
  }, [currentMember]);

  // Only show loading when we have no data AND are fetching (but not when data is being refetched)
  const isLoading =
    (!workspace && isWorkspaceLoading) ||
    (!channels && isChannelsLoading) ||
    (!currentMember && isMemberLoading);
  const hasError = workspaceError || channelsError || memberError;

  useEffect(() => {
    if (isLoading || !workspace || !currentMember) {
      return;
    }

    if (channelId) {
      if (isDesktop) {
        router.replace(`/${workspaceId}/c-${channelId}`);
      }
    } else if (!open && isAdmin) {
      if (isDesktop) {
        setOpen(true);
      }
    }
  }, [
    isLoading,
    workspace,
    currentMember,
    isAdmin,
    channelId,
    open,
    setOpen,
    router,
    workspaceId,
    isDesktop,
  ]);

  // Show loading if we have channels and should navigate but haven't yet (desktop only)
  const shouldNavigateToChannel = channelId && isDesktop;
  const shouldShowLoading = isLoading || shouldNavigateToChannel;

  if (shouldShowLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shouldShowLoading && (hasError || !workspace || !currentMember)) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {hasError ? 'Error loading workspace' : 'Workspace not found'}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Mobile view: Show workspace sidebar */}
      <div className="md:hidden h-full overflow-y-auto relative">
        <WorkspaceSidebar />
        {/* Floating action button for creating DMs */}
        <Button
          onClick={startConversationCreation}
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <SquarePen className="h-6 w-6" />
        </Button>
      </div>

      {/* Desktop view: Show no channel message only if we definitively have no channels */}
      {channels && channels.length === 0 && isDesktop && (
        <div className="hidden md:flex h-full flex-1 items-center justify-center flex-col gap-2">
          <TriangleAlert className="size-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No channel found</span>
        </div>
      )}
    </>
  );
};

export default WorkspaceIdPage;
