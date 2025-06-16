import { useMutation, useQuery } from '@tanstack/react-query';
import { messagesApi } from './messages-api';
import type { Message, CreateMessageData } from './messages-api';

// Get messages for a channel
export const useGetMessages = (channelId: string, params?: { before?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['messages', channelId, params],
    queryFn: async () => {
      const response = await messagesApi.getMessages(channelId, params);
      return response.data.data;
    },
    enabled: !!channelId,
  });
};

// Create a new message
export const useCreateMessage = () => {
  return useMutation({
    mutationFn: async (data: CreateMessageData) => {
      const response = await messagesApi.createMessage(data);
      return response.data.data.message;
    },
  });
};

// Update a message
export const useUpdateMessage = () => {
  return useMutation({
    mutationFn: async ({ channelId, messageId, content }: { channelId: string; messageId: string; content: string }) => {
      const response = await messagesApi.updateMessage(channelId, messageId, content);
      return response.data.data.message;
    },
  });
};

// Delete a message
export const useDeleteMessage = () => {
  return useMutation({
    mutationFn: async ({ channelId, messageId }: { channelId: string; messageId: string }) => {
      await messagesApi.deleteMessage(channelId, messageId);
    },
  });
}; 