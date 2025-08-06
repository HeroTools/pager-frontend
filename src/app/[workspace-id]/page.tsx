'use client';

import { Loader, SquarePen, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WorkspaceSidebar } from '@/components/side-nav/workspace-sidebar';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useCreateChannelModal } from '@/features/channels/store/use-create-channel-modal';
import { useConversationCreateStore } from '@/features/conversations/store/conversation-create-store';
import { useCurrentMember } from '@/features/members/hooks/use-members';
import { useGetWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { useWorkspaceId } from '@/hooks/use-workspace-id';

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId() as string;
  const { open, setOpen } = useCreateChannelModal();
  const { startConversationCreation } = useConversationCreateStore();

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

  // Note: Desktop-only redirect logic
  // We'll handle this with CSS media queries for proper responsive behavior
  useEffect(() => {
    if (isLoading || !workspace || !currentMember) {
      return;
    }

    // Desktop-only: redirect to first channel or open create modal
    // This will only run on desktop due to page structure
    if (channelId) {
      // Check if we're on desktop (window width >= 768px)
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        router.push(`/${workspaceId}/c-${channelId}`);
      }
    } else if (!open && isAdmin) {
      // Only open modal on desktop
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setOpen(true);
      }
    }
  }, [isLoading, workspace, currentMember, isAdmin, channelId, open, setOpen, router, workspaceId]);

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

      {/* Desktop view: Show no channel message */}
      <div className="hidden md:flex h-full flex-1 items-center justify-center flex-col gap-2">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No channel found</span>
      </div>
    </>
  );
};

export default WorkspaceIdPage;
