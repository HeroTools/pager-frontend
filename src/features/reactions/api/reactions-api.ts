import api from '@/lib/api/axios-client';
import type { ToggleReactionResponse } from '../types';

export const reactionsApi = {
  /**
   * toggle reaction from message
   */
  toggleReaction: async (
    action: 'add' | 'remove',
    workspaceId: string,
    messageId: string,
    reactionValue: string,
  ): Promise<ToggleReactionResponse> => {
    const { data: response } = await api.post<ToggleReactionResponse>(
      `/workspaces/${workspaceId}/messages/${messageId}/reactions/toggle`,
      { action, value: reactionValue },
    );
    return response;
  },
};
