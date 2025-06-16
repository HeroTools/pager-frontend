import { useMutation, useQuery } from '@tanstack/react-query';
import { channelsApi } from './channels-api';
import type { Channel, CreateChannelData } from './channels-api';

// Get all channels for a workspace
export const useGetChannels = (workspaceId: string) => {
  return useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: async () => {
      const response = await channelsApi.getChannels(workspaceId);
      return response.data.data.channels;
    },
    enabled: !!workspaceId,
  });
};

// Get a single channel
export const useGetChannel = (workspaceId: string, channelId: string) => {
  return useQuery({
    queryKey: ['channel', workspaceId, channelId],
    queryFn: async () => {
      const response = await channelsApi.getChannel(workspaceId, channelId);
      return response.data.data.channel;
    },
    enabled: !!(workspaceId && channelId),
  });
};

// Create a new channel
export const useCreateChannel = () => {
  return useMutation({
    mutationFn: async (data: CreateChannelData) => {
      const response = await channelsApi.createChannel(data);
      return response.data.data.channel;
    },
  });
};

// Update channel settings
export const useUpdateChannel = () => {
  return useMutation({
    mutationFn: async ({ workspaceId, channelId, data }: { workspaceId: string; channelId: string; data: Partial<CreateChannelData> }) => {
      const response = await channelsApi.updateChannel(workspaceId, channelId, data);
      return response.data.data.channel;
    },
  });
};

// Delete a channel
export const useDeleteChannel = () => {
  return useMutation({
    mutationFn: async ({ workspaceId, channelId }: { workspaceId: string; channelId: string }) => {
      await channelsApi.deleteChannel(workspaceId, channelId);
    },
  });
}; 