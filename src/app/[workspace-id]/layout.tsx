import { dehydrate, QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { HydrationBoundary } from '@/components/react-query-provider';
import { authQueryKeys } from '@/features/auth/query-keys';
import { workspacesQueryKeys } from '@/features/workspaces/query-keys';
import { channelsQueryKeys } from '@/features/channels/query-keys';
import { conversationsQueryKeys } from '@/features/conversations/query-keys';
import { serverApi } from '@/lib/api/server-api';
import { WorkspaceLayoutClient } from './workspace-layout-client';

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: { 'workspace-id': string };
}

const WorkspaceLayout = async ({ children, params }: WorkspaceLayoutProps) => {
  const resolvedParams = await params;
  const workspaceId = resolvedParams['workspace-id'];
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
  });

  // Prefetch critical data in parallel on the server
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: authQueryKeys.currentUser(),
        queryFn: () => serverApi.getCurrentUser(workspaceId),
        staleTime: 1000 * 60 * 5, // Match client staleTime
      }),
      queryClient.prefetchQuery({
        queryKey: workspacesQueryKeys.workspace(workspaceId),
        queryFn: () => serverApi.getWorkspace(workspaceId),
        staleTime: 1000 * 60 * 5, // Match client staleTime
      }),
      // Prefetch sidebar data for instant loading
      queryClient.prefetchQuery({
        queryKey: channelsQueryKeys.userChannels(workspaceId, null),
        queryFn: () => serverApi.getUserChannels(workspaceId),
        staleTime: 1000 * 60 * 5, // Match client staleTime
      }),
      queryClient.prefetchQuery({
        queryKey: conversationsQueryKeys.conversations(workspaceId),
        queryFn: () => serverApi.getConversations(workspaceId),
        staleTime: 1000 * 60 * 5, // Match client staleTime
      }),
    ]);
  } catch (error) {
    // Log error but don't block rendering - queries will retry on client
    console.warn('Server prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkspaceLayoutClient>{children}</WorkspaceLayoutClient>
    </HydrationBoundary>
  );
};

export default WorkspaceLayout;