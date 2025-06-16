import { AxiosResponse } from 'axios';
import { axiosInstance } from '@/lib/axios';

export interface Reaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  createdAt: string;
}

export interface ReactionResponse {
  success: boolean;
  data: {
    reaction: Reaction;
  };
  error?: string;
}

export interface ReactionsResponse {
  success: boolean;
  data: {
    reactions: Reaction[];
  };
  error?: string;
}

export interface ToggleReactionResponse {
  success: boolean;
  data: {
    reaction?: Reaction;
    removed: boolean;
  };
  error?: string;
}

export const reactionsApi = {
  getReactions: (messageId: string): Promise<AxiosResponse<ReactionsResponse>> => {
    return axiosInstance.get(`/messages/${messageId}/reactions`);
  },

  toggleReaction: (messageId: string, emoji: string): Promise<AxiosResponse<ToggleReactionResponse>> => {
    return axiosInstance.post(`/messages/${messageId}/reactions/toggle`, { emoji });
  },

  addReaction: (messageId: string, emoji: string): Promise<AxiosResponse<ReactionResponse>> => {
    return axiosInstance.post(`/messages/${messageId}/reactions`, { emoji });
  },

  removeReaction: (messageId: string, reactionId: string): Promise<AxiosResponse> => {
    return axiosInstance.delete(`/messages/${messageId}/reactions/${reactionId}`);
  },
}; 