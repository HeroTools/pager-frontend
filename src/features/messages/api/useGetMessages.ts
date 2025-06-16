import { usePaginatedQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const BATCH_SIZE = 20;

interface useGetMessagesProps {
  conversationId?: Id<"conversations">;
  channelId?: Id<"channels">;
  parentMessageId?: Id<"messages">;
}

export const useGetMessages = ({
  conversationId,
  channelId,
  parentMessageId,
}: useGetMessagesProps) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.get,
    {
      conversationId,
      channelId,
      parentMessageId,
    },
    {
      initialNumItems: BATCH_SIZE,
    }
  );

  return {
    results,
    status,
    loadMore: () => loadMore(BATCH_SIZE),
  };
};
