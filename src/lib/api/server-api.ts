import type { CurrentUser } from '@/features/auth/types';
import type { ChannelEntity } from '@/features/channels/types';
import type { ConversationEntity } from '@/features/conversations/types';
import type { WorkspaceEntity, WorkspaceResponseData } from '@/features/workspaces/types';
import { createServerApiClient } from './server-client';

export const serverApi = {
  /**
   * Get current user from server
   */
  getCurrentUser: async (workspaceId: string): Promise<CurrentUser> => {
    const client = await createServerApiClient();
    const { data: response } = await client.get<CurrentUser>(
      `/auth/user?workspaceId=${workspaceId}`,
    );
    return response;
  },

  /**
   * Get workspace by ID from server
   */
  getWorkspace: async (id: string): Promise<WorkspaceResponseData> => {
    const client = await createServerApiClient();
    const { data: response } = await client.get<{ workspace: WorkspaceResponseData }>(
      `/workspaces/${id}?include_details=false`,
    );
    return response?.workspace;
  },

  /**
   * Get all workspaces from server
   */
  getWorkspaces: async (): Promise<WorkspaceEntity[]> => {
    const client = await createServerApiClient();
    const { data: response } = await client.get<WorkspaceEntity[]>(`/workspaces`);
    return response || [];
  },

  /**
   * Get user channels from server
   */
  getUserChannels: async (workspaceId: string): Promise<ChannelEntity[]> => {
    const client = await createServerApiClient();
    const { data: response } = await client.get<ChannelEntity[]>(
      `/workspaces/${workspaceId}/members/me/channels`,
    );
    return response || [];
  },

  /**
   * Get conversations from server
   */
  getConversations: async (workspaceId: string): Promise<ConversationEntity[]> => {
    const client = await createServerApiClient();
    const { data: response } = await client.get<ConversationEntity[]>(
      `/workspaces/${workspaceId}/conversations`,
    );
    return response || [];
  },
};
