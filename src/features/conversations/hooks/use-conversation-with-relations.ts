import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";
import type { ConversationMessageFilters } from "../types";

export const useConversationMessagesWithRelations = (
  workspaceId: string,
  conversationId: string,
  filters?: Partial<ConversationMessageFilters>
) => {
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "conversation-messages",
      workspaceId,
      conversationId,
      "relations",
      filters,
    ],
    queryFn: () =>
      conversationsApi.getConversationMessagesWithRelations(
        workspaceId,
        conversationId,
        filters
      ),
    enabled: !!(workspaceId && conversationId),
  });

  return {
    messages,
    isLoading,
    error,
  };
};
