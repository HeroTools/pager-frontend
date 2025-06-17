import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "../api/messages-api";
import type {
  MessageEntity,
  ChannelMessage,
  CreateChannelMessageData,
  UpdateMessageData,
  MessageFilters,
  AddReactionData,
} from "../types";

// Get messages for a channel
export const useGetChannelMessages = (
  workspaceId: string,
  channelId: string,
  filters?: Partial<MessageFilters>
) => {
  return useQuery({
    queryKey: ["messages", workspaceId, channelId, filters],
    queryFn: () =>
      messagesApi.getChannelMessages(workspaceId, channelId, filters),
    enabled: !!(workspaceId && channelId),
  });
};

// Get messages with relations for a channel
export const useGetChannelMessagesWithRelations = (
  workspaceId: string,
  channelId: string,
  filters?: Partial<MessageFilters>
) => {
  return useQuery({
    queryKey: ["messages", workspaceId, channelId, "relations", filters],
    queryFn: () =>
      messagesApi.getChannelMessagesWithRelations(
        workspaceId,
        channelId,
        filters
      ),
    enabled: !!(workspaceId && channelId),
  });
};

// Get a single message
export const useGetMessage = (workspaceId: string, messageId: string) => {
  return useQuery({
    queryKey: ["message", workspaceId, messageId],
    queryFn: () => messagesApi.getMessage(workspaceId, messageId),
    enabled: !!(workspaceId && messageId),
  });
};

// Get a single message with relations
export const useGetMessageWithRelations = (
  workspaceId: string,
  messageId: string
) => {
  return useQuery({
    queryKey: ["message", workspaceId, messageId, "relations"],
    queryFn: () => messagesApi.getMessageWithRelations(workspaceId, messageId),
    enabled: !!(workspaceId && messageId),
  });
};

// Get message thread
export const useGetMessageThread = (workspaceId: string, messageId: string) => {
  return useQuery({
    queryKey: ["messageThread", workspaceId, messageId],
    queryFn: () => messagesApi.getMessageThread(workspaceId, messageId),
    enabled: !!(workspaceId && messageId),
  });
};

// Search messages
export const useSearchMessages = (
  workspaceId: string,
  query: string,
  filters?: Partial<MessageFilters>
) => {
  return useQuery({
    queryKey: ["messageSearch", workspaceId, query, filters],
    queryFn: () => messagesApi.searchMessages(workspaceId, query, filters),
    enabled: !!(workspaceId && query && query.length > 2),
  });
};

// Create a new message
export const useCreateChannelMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      data,
    }: {
      workspaceId: string;
      channelId: string;
      data: CreateChannelMessageData;
    }) => messagesApi.createChannelMessage(workspaceId, channelId, data),
    onSuccess: (newMessage, variables) => {
      // Update the messages list cache
      queryClient.setQueryData<{
        messages: ChannelMessage[];
        has_more: boolean;
      }>(["messages", variables.workspaceId, variables.channelId], (old) =>
        old
          ? {
              ...old,
              messages: [...old.messages, newMessage as ChannelMessage],
            }
          : { messages: [newMessage as ChannelMessage], has_more: false }
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.workspaceId, variables.channelId],
      });

      // Update channel cache to reflect new activity
      queryClient.invalidateQueries({
        queryKey: ["channel", variables.workspaceId, variables.channelId],
      });
    },
  });
};

// Update a message
export const useUpdateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
      data,
    }: {
      workspaceId: string;
      messageId: string;
      data: UpdateMessageData;
    }) => messagesApi.updateMessage(workspaceId, messageId, data),
    onSuccess: (updatedMessage, variables) => {
      // Update the specific message cache
      queryClient.setQueryData<MessageEntity>(
        ["message", variables.workspaceId, variables.messageId],
        updatedMessage
      );

      // Update message in all relevant message lists
      queryClient.setQueryData<{
        messages: ChannelMessage[];
        has_more: boolean;
      }>(
        ["messages", variables.workspaceId, updatedMessage.channel_id],
        (old) =>
          old
            ? {
                ...old,
                messages: old.messages.map((msg) =>
                  msg.id === variables.messageId
                    ? (updatedMessage as ChannelMessage)
                    : msg
                ),
              }
            : old
      );
    },
  });
};

// Delete a message
export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
    }: {
      workspaceId: string;
      messageId: string;
    }) => messagesApi.deleteMessage(workspaceId, messageId),
    onSuccess: (_, variables) => {
      // For soft delete, invalidate instead of removing from cache
      // since the message still exists but is marked as deleted
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["message", variables.workspaceId, variables.messageId],
      });
    },
  });
};

// Reply to a message
export const useReplyToMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      parentMessageId,
      data,
    }: {
      workspaceId: string;
      parentMessageId: string;
      data: Omit<CreateChannelMessageData, "parent_message_id">;
    }) => messagesApi.replyToMessage(workspaceId, parentMessageId, data),
    onSuccess: (newReply, variables) => {
      // Invalidate message thread to show new reply
      queryClient.invalidateQueries({
        queryKey: [
          "messageThread",
          variables.workspaceId,
          variables.parentMessageId,
        ],
      });

      // Invalidate messages list to update thread indicators
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.workspaceId],
      });
    },
  });
};

// Add reaction to message
export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
      data,
    }: {
      workspaceId: string;
      messageId: string;
      data: AddReactionData;
    }) => messagesApi.addReaction(workspaceId, messageId, data),
    onSuccess: (_, variables) => {
      // Invalidate message with relations to show new reaction
      queryClient.invalidateQueries({
        queryKey: [
          "message",
          variables.workspaceId,
          variables.messageId,
          "relations",
        ],
      });

      // Invalidate messages with relations lists
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.workspaceId],
      });
    },
  });
};

// Remove reaction from message
export const useRemoveReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
      reactionValue,
    }: {
      workspaceId: string;
      messageId: string;
      reactionValue: string;
    }) => messagesApi.removeReaction(workspaceId, messageId, reactionValue),
    onSuccess: (_, variables) => {
      // Invalidate message with relations to remove reaction
      queryClient.invalidateQueries({
        queryKey: [
          "message",
          variables.workspaceId,
          variables.messageId,
          "relations",
        ],
      });

      // Invalidate messages with relations lists
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.workspaceId],
      });
    },
  });
};
