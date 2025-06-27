import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { channelsApi } from "../api/channels-api";
import type {
  ChannelEntity,
  CreateChannelData,
  UpdateChannelData,
  ChannelFilters,
  AddChannelMembersData,
  UpdateChannelMemberData,
  GetChannelMessagesParams,
  MutateCreateChannelContext,
} from "../types";

// Get all public and joined channels for a workspace for the user
export const useGetAllAvailableChannels = (
  workspaceId: string,
  filters?: Partial<ChannelFilters>
) => {
  return useQuery({
    queryKey: ["channels", workspaceId, filters],
    queryFn: () => channelsApi.getAllAvailableChannels(workspaceId, filters),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 60 * 1000,
  });
};

// Get all channels the user belongs to
export const useGetUserChannels = (
  workspaceId: string,
  filters?: Partial<ChannelFilters>
) => {
  return useQuery({
    queryKey: ["user-channels", workspaceId, filters],
    queryFn: () => channelsApi.getUserChannels(workspaceId, filters),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 60 * 1000,
  });
};

export function useGetChannel(workspaceId: string, channelId: string) {
  const qc = useQueryClient();

  return useQuery<ChannelEntity>({
    queryKey: ["channel", workspaceId, channelId],
    queryFn: () => channelsApi.getChannel(workspaceId, channelId),
    enabled: !!workspaceId && !!channelId,
    // 1. Seed from your list cache
    initialData: () =>
      qc
        .getQueryData<ChannelEntity[]>(["channels", workspaceId])
        ?.find((c) => c.id === channelId),
    // 2. Don't refetch on every mount/focus
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Get a channel with its messages
export const useGetChannelWithMessages = (
  workspaceId: string,
  channelId: string,
  params?: GetChannelMessagesParams
) => {
  return useQuery({
    queryKey: ["channel", workspaceId, channelId, "messages", params],
    queryFn: () =>
      channelsApi.getChannelWithMessages(workspaceId, channelId, params),
    enabled: !!(workspaceId && channelId),
    staleTime: 2 * 60 * 60 * 1000, // Consider data fresh for 2 hours
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
  });
};

export const useGetChannelWithMessagesInfinite = (
  workspaceId: string,
  channelId: string,
  limit: number = 50
) => {
  return useInfiniteQuery({
    queryKey: ["channel", workspaceId, channelId, "messages", "infinite"],
    queryFn: ({ pageParam }) =>
      channelsApi.getChannelWithMessages(workspaceId, channelId, {
        limit,
        cursor: pageParam,
      }),
    enabled: !!workspaceId && !!channelId,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;

      if (!pagination) {
        return undefined;
      }

      return pagination.hasMore ? pagination.nextCursor : undefined;
    },
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    initialPageParam: undefined as string | undefined,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
  });
};

// Create a new channel
export const useCreateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ChannelEntity,
    Error,
    CreateChannelData,
    MutateCreateChannelContext
  >({
    mutationFn: (data: CreateChannelData) => channelsApi.createChannel(data),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["user-channels", variables.workspaceId, null],
      });

      // Snapshot previous value
      const previousChannels = queryClient.getQueryData<ChannelEntity[]>([
        "user-channels",
        variables.workspaceId,
        null,
      ]);

      return {
        workspaceId: variables.workspaceId,
        previousChannels,
      };
    },

    onSuccess: (newChannel, variables, context) => {
      // Update cache with the new channel
      queryClient.setQueryData<ChannelEntity[]>(
        ["user-channels", variables.workspaceId, null],
        (old) => (old ? [...old, newChannel] : [newChannel])
      );
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousChannels) {
        queryClient.setQueryData<ChannelEntity[]>(
          ["user-channels", variables.workspaceId, null],
          context.previousChannels
        );
      }
    },

    onSettled: (data, error, variables, context) => {
      // Always refetch to ensure consistency
      if (context?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ["user-channels", context.workspaceId, null],
        });
      }
    },
  });
};

// Update a channel
export const useUpdateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { channelId: string },
    Error,
    {
      workspaceId: string;
      channelId: string;
      data: UpdateChannelData;
    }
  >({
    mutationFn: ({ workspaceId, channelId, data }) =>
      channelsApi.updateChannel(workspaceId, channelId, data),

    onSuccess: (response, variables) => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ["channel", variables.workspaceId, variables.channelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["channels", variables.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-channels", variables.workspaceId],
      });
    },

    onError: (error, variables) => {
      // Invalidate related queries on error to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["channel", variables.workspaceId, variables.channelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["channels", variables.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-channels", variables.workspaceId],
      });
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

      // Remove from user channels cache
      queryClient.setQueryData<ChannelEntity[]>(
        ["user-channels", variables.workspaceId, null],
        (old) =>
          old?.filter((channel) => channel.id !== variables.channelId) || []
      );

      // Remove all related channel caches
      queryClient.removeQueries({
        queryKey: ["channel", variables.workspaceId, variables.channelId],
      });

      // Invalidate all channel-related queries for this workspace
      queryClient.invalidateQueries({
        queryKey: ["channels", variables.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-channels", variables.workspaceId],
      });
    },
  });
};

// Join a channel


// Add channel member
export const useAddChannelMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      data,
    }: {
      workspaceId: string;
      channelId: string;
      data: AddChannelMembersData;
    }) => channelsApi.addChannelMembers(workspaceId, channelId, data),
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
      
      // Invalidate all channels queries to refresh membership status
      queryClient.invalidateQueries({
        queryKey: ["channels", variables.workspaceId],
      });
      
      // Invalidate user channels to refresh sidebar
      queryClient.invalidateQueries({
        queryKey: ["user-channels", variables.workspaceId],
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
export const useRemoveChannelMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      channelId,
      channelMemberIds,
      isCurrentUserLeaving,
    }: {
      workspaceId: string;
      channelId: string;
      channelMemberIds: string[];
      isCurrentUserLeaving?: boolean;
    }) =>
      channelsApi.removeChannelMembers(
        workspaceId,
        channelId,
        channelMemberIds
      ),
    onMutate: async ({ workspaceId, channelId, channelMemberIds }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: ["channel", workspaceId, channelId, "members"],
      });

      // Snapshot the previous value
      const previousMembers = queryClient.getQueryData([
        "channel",
        workspaceId,
        channelId,
        "members",
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ["channel", workspaceId, channelId, "members"],
        (old: any) =>
          old?.filter((member: any) => !channelMemberIds.includes(member.id))
      );

      // Return context for rollback
      return { previousMembers };
    },
    onError: (err, { workspaceId, channelId }, context) => {
      // Rollback optimistic update on error
      queryClient.setQueryData(
        ["channel", workspaceId, channelId, "members"],
        context?.previousMembers
      );
    },
    onSuccess: (_, { workspaceId, channelId, isCurrentUserLeaving }) => {
      // Only remove channel from user's cache if current user is leaving
      if (isCurrentUserLeaving) {
        queryClient.setQueryData<ChannelEntity[]>(
          ["user-channels", workspaceId, null],
          (old: ChannelEntity[] | undefined) => old?.filter((channel) => channel.id !== channelId) || []
        );
      }
    },
    onSettled: (_, __, { workspaceId, channelId }) => {
      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId, channelId, "members"],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-channels", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["channels", workspaceId],
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

// Get channel members
export const useGetChannelMembers = (
  workspaceId: string,
  channelId: string
) => {
  return useQuery({
    queryKey: ["channel", workspaceId, channelId, "members"],
    queryFn: () => channelsApi.getChannelMembers(workspaceId, channelId),
    enabled: !!(workspaceId && channelId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
