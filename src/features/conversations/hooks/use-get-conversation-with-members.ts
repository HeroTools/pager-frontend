import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";

export const useGetConversationWithMembers = (
  workspaceId: string,
  conversationId: string
) => {
  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversation", workspaceId, conversationId, "members"],
    queryFn: () =>
      conversationsApi.getConversationWithMembers(workspaceId, conversationId),
    enabled: !!(workspaceId && conversationId),
  });

  return {
    conversation,
    isLoading,
    error,
  };
};
