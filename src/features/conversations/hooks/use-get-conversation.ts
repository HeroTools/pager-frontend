import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";

export const useGetConversation = (
  workspaceId: string,
  conversationId: string
) => {
  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversation", workspaceId, conversationId],
    queryFn: () =>
      conversationsApi.getConversation(workspaceId, conversationId),
    enabled: !!(workspaceId && conversationId),
  });

  return {
    conversation,
    isLoading,
    error,
  };
};
