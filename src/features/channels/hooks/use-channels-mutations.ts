import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "../api/channels-api";
import type {
  ChannelEntity,
  ChannelWithMembersList,
  CreateChannelData,
  UpdateChannelData,
  ChannelFilters,
  AddChannelMemberData,
  UpdateChannelMemberData,
} from "../types";

// Get all channels for a workspace
export const useGetChannels = (
  workspaceId: string,
  filters?: Partial<ChannelFilters>
) => {
  return useQuery({
    queryKey: ["channels", workspaceId, filters],
    queryFn: () => channelsApi.getChannels(workspaceId, filters),
    enabled: !!workspaceId,
  });
};

// Get a single channel
export const useGetChannel = (workspaceId: string, channelId: string) => {
  return useQuery({
    queryKey: ["channel", workspaceId, channelId],
    queryFn: () => channelsApi.getChannel(workspaceId, channelId),
    enabled: !!(workspaceId && channelId),
  });
};

// Get a channel with its members
export const useGetChannelWithMembers = (
  workspaceId: string,
  channelId: string
) => {
  return useQuery({
    queryKey: ["channel", workspaceId, channelId, "members"],
    queryFn: () => channelsApi.getChannelWithMembers(workspaceId, channelId),
    enabled: !!(workspaceId && channelId),
  });
};

// Create a new channel
export const useCreateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelData) => channelsApi.createChannel(data),
    onSuccess: (newChannel, variables) => {
      // Update the channels list cache
      queryClient.setQueryData<ChannelEntity[]>(
        ["channels", variables.workspace_id],
        (old) => (old ? [...old, newChannel] : [newChannel])
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["channels", variables.workspace_id],
      });
    },
  });
};

// Update channel settings
export const useUpdateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      data,
    }: {
      workspaceId: string;
      channelId: string;
      data: UpdateChannelData;
    }) => channelsApi.updateChannel(workspaceId, channelId, data),
    onSuccess: (updatedChannel, variables) => {
      // Update the specific channel cache
      queryClient.setQueryData<ChannelEntity>(
        ["channel", variables.workspaceId, variables.channelId],
        updatedChannel
      );

      // Update the channel in the channels list
      queryClient.setQueryData<ChannelEntity[]>(
        ["channels", variables.workspaceId],
        (old) =>
          old?.map((channel) =>
            channel.id === variables.channelId ? updatedChannel : channel
          ) || []
      );

      // Also update any cached channel with members
      queryClient.setQueryData<ChannelWithMembersList>(
        ["channel", variables.workspaceId, variables.channelId, "members"],
        (old) => (old ? { ...old, ...updatedChannel } : undefined)
      );
    },
  });
};

// Delete a channel
export const useDeleteChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
    }: {
      workspaceId: string;
      channelId: string;
    }) => channelsApi.deleteChannel(workspaceId, channelId),
    onSuccess: (_, variables) => {
      // Remove from channels list cache
      queryClient.setQueryData<ChannelEntity[]>(
        ["channels", variables.workspaceId],
        (old) =>
          old?.filter((channel) => channel.id !== variables.channelId) || []
      );

      // Remove all related channel caches
      queryClient.removeQueries({
        queryKey: ["channel", variables.workspaceId, variables.channelId],
      });
    },
  });
};

// Join a channel
export const useJoinChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
    }: {
      workspaceId: string;
      channelId: string;
    }) => channelsApi.joinChannel(workspaceId, channelId),
    onSuccess: (_, variables) => {
      // Invalidate channels list to refresh membership status
      queryClient.invalidateQueries({
        queryKey: ["channels", variables.workspaceId],
      });

      // Invalidate channel with members to refresh member list
      queryClient.invalidateQueries({
        queryKey: [
          "channel",
          variables.workspaceId,
          variables.channelId,
          "members",
        ],
      });
    },
  });
};

// Leave a channel
export const useLeaveChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
    }: {
      workspaceId: string;
      channelId: string;
    }) => channelsApi.leaveChannel(workspaceId, channelId),
    onSuccess: (_, variables) => {
      // Invalidate channels list to refresh membership status
      queryClient.invalidateQueries({
        queryKey: ["channels", variables.workspaceId],
      });

      // Invalidate channel with members to refresh member list
      queryClient.invalidateQueries({
        queryKey: [
          "channel",
          variables.workspaceId,
          variables.channelId,
          "members",
        ],
      });
    },
  });
};

// Add channel member
export const useAddChannelMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      data,
    }: {
      workspaceId: string;
      channelId: string;
      data: AddChannelMemberData;
    }) => channelsApi.addChannelMember(workspaceId, channelId, data),
    onSuccess: (_, variables) => {
      // Invalidate channel with members to refresh member list
      queryClient.invalidateQueries({
        queryKey: [
          "channel",
          variables.workspaceId,
          variables.channelId,
          "members",
        ],
      });
    },
  });
};

// Update channel member
export const useUpdateChannelMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      memberId,
      data,
    }: {
      workspaceId: string;
      channelId: string;
      memberId: string;
      data: UpdateChannelMemberData;
    }) =>
      channelsApi.updateChannelMember(workspaceId, channelId, memberId, data),
    onSuccess: (_, variables) => {
      // Invalidate channel with members to refresh member list
      queryClient.invalidateQueries({
        queryKey: [
          "channel",
          variables.workspaceId,
          variables.channelId,
          "members",
        ],
      });
    },
  });
};

// Remove channel member
export const useRemoveChannelMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      memberId,
    }: {
      workspaceId: string;
      channelId: string;
      memberId: string;
    }) => channelsApi.removeChannelMember(workspaceId, channelId, memberId),
    onSuccess: (_, variables) => {
      // Invalidate channel with members to refresh member list
      queryClient.invalidateQueries({
        queryKey: [
          "channel",
          variables.workspaceId,
          variables.channelId,
          "members",
        ],
      });
    },
  });
};

// Mark channel as read
export const useMarkChannelAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      messageId,
    }: {
      workspaceId: string;
      channelId: string;
      messageId: string;
    }) => channelsApi.markChannelAsRead(workspaceId, channelId, messageId),
    onSuccess: (_, variables) => {
      // Invalidate channel with members to update read status
      queryClient.invalidateQueries({
        queryKey: [
          "channel",
          variables.workspaceId,
          variables.channelId,
          "members",
        ],
      });
    },
  });
};

// Update notification settings
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      enabled,
    }: {
      workspaceId: string;
      channelId: string;
      enabled: boolean;
    }) =>
      channelsApi.updateNotificationSettings(workspaceId, channelId, enabled),
    onSuccess: (_, variables) => {
      // Invalidate channel with members to update notification settings
      queryClient.invalidateQueries({
        queryKey: [
          "channel",
          variables.workspaceId,
          variables.channelId,
          "members",
        ],
      });
    },
  });
};
