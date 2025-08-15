import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ReactNode } from 'react';

import { agentsApi } from '@/features/agents/api/agents-api';
import { agentsQueryKeys } from '@/features/agents/query-keys';
import { authApi } from '@/features/auth/api/auth-api';
import { authQueryKeys } from '@/features/auth/query-keys';
import { channelsApi } from '@/features/channels/api/channels-api';
import { channelsQueryKeys } from '@/features/channels/query-keys';
import { conversationsApi } from '@/features/conversations/api/conversations-api';
import { conversationsQueryKeys } from '@/features/conversations/query-keys';
import { membersApi } from '@/features/members/api/members-api';
import { membersQueryKeys } from '@/features/members/query-keys';
import { workspacesApi } from '@/features/workspaces/api/workspaces-api';
import { workspacesQueryKeys } from '@/features/workspaces/query-keys';

interface ServerLayoutProps {
  children: ReactNode;
  workspaceId: string;
}

/**
 * Server component that prefetches all workspace data
 */
export async function ServerLayout({ children, workspaceId }: ServerLayoutProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
  });

  try {
    // Prefetch all workspace data in parallel
    await Promise.allSettled([
      // Prefetch all workspaces (for instant workspace switching)
      queryClient.prefetchQuery({
        queryKey: workspacesQueryKeys.workspaces(),
        queryFn: () => workspacesApi.getWorkspaces(),
        staleTime: 4 * 60 * 60 * 1000, // 4 hours
      }),

      // Prefetch current workspace
      queryClient.prefetchQuery({
        queryKey: workspacesQueryKeys.workspace(workspaceId),
        queryFn: () => workspacesApi.getWorkspace(workspaceId),
        staleTime: 4 * 60 * 60 * 1000, // 4 hours
      }),

      // Prefetch user channels
      queryClient.prefetchQuery({
        queryKey: channelsQueryKeys.userChannels(workspaceId, null),
        queryFn: () => channelsApi.getUserChannels(workspaceId),
        staleTime: 2 * 60 * 60 * 1000, // 2 hours
      }),

      // Prefetch conversations
      queryClient.prefetchQuery({
        queryKey: conversationsQueryKeys.conversations(workspaceId),
        queryFn: () => conversationsApi.getConversations(workspaceId),
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),

      // Prefetch agents
      queryClient.prefetchQuery({
        queryKey: agentsQueryKeys.agents(workspaceId),
        queryFn: () => agentsApi.getAgents(workspaceId),
        staleTime: 2 * 60 * 60 * 1000, // 2 hours
      }),

      // Prefetch workspace members (for member-related features)
      queryClient.prefetchQuery({
        queryKey: membersQueryKeys.members(workspaceId),
        queryFn: () => membersApi.getMembers(workspaceId),
        staleTime: 1 * 60 * 60 * 1000, // 1 hour - members change more frequently
      }),

      // Prefetch current user
      queryClient.prefetchQuery({
        queryKey: authQueryKeys.currentUser(),
        queryFn: () => authApi.getCurrentUser(workspaceId),
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),
    ]);
  } catch (error) {
    // Log error but don't crash - client will handle loading states
    console.warn(`⚠️ Server prefetch failed for workspace ${workspaceId}:`, error);
  }

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
