import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";

export const useCurrentConversation = (workspaceId: string) => {
  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["current-conversation", workspaceId],
    queryFn: () => conversationsApi.getCurrentConversation(workspaceId),
    enabled: !!workspaceId,
  });

  return {
    conversation,
    isLoading,
    error,
  };
};

// features/conversations/hooks/use-get-conversation.ts
export const useGetConversation = (conversationId: string) => {
  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => conversationsApi.getConversation(conversationId),
    enabled: !!conversationId,
  });

  return {
    conversation,
    isLoading,
    error,
  };
};
