import api from "@/lib/api/axios-client";
import type {
  Reaction,
  AddReactionData,
  ToggleReactionData,
  ReactionResponse,
  ReactionsResponse,
  ToggleReactionResponse,
} from "../types";

export const reactionsApi = {
  /**
   * Get all reactions for a message
   */
  getReactions: async (messageId: string): Promise<Reaction[]> => {
    const { data: response } = await api.get<ReactionsResponse>(
      `/messages/${messageId}/reactions`
    );
    return response.data.reactions;
  },

  /**
   * Toggle reaction on a message (add if not exists, remove if exists)
   */
  toggleReaction: async (
    messageId: string,
    emoji: string
  ): Promise<{ reaction?: Reaction; removed: boolean }> => {
    const { data: response } = await api.post<ToggleReactionResponse>(
      `/messages/${messageId}/reactions/toggle`,
      { emoji }
    );
    return response.data;
  },

  /**
   * Add reaction to a message
   */
  addReaction: async (messageId: string, emoji: string): Promise<Reaction> => {
    const { data: response } = await api.post<ReactionResponse>(
      `/messages/${messageId}/reactions`,
      { emoji }
    );
    return response.data.reaction;
  },

  /**
   * Remove reaction from a message
   */
  removeReaction: async (
    messageId: string,
    reactionId: string
  ): Promise<void> => {
    await api.delete(`/messages/${messageId}/reactions/${reactionId}`);
  },
};
