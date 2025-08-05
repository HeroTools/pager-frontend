import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { channelsApi } from '../api/channels-api';
import { channelsQueryKeys } from '../query-keys';
import type {
  AddChannelMembersData,
  ChannelEntity,
  ChannelFilters,
  ChannelMemberResponse,
  CreateChannelData,
  MutateCreateChannelContext,
  RemoveChannelMembersParams,
  UpdateChannelData,
} from '../types';

// Get all public and joined channels for a workspace for the user
export const useGetAllAvailableChannels = (
  workspaceId: string,
  filters?: Partial<ChannelFilters>,
) => {
  return useQuery({
    queryKey: channelsQueryKeys.channels(workspaceId, filters),
    queryFn: () => channelsApi.getAllAvailableChannels(workspaceId, filters),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 60 * 1000,
  });
};

// Get all channels the user belongs to
export const useGetUserChannels = (workspaceId: string, filters?: Partial<ChannelFilters>) => {
  return useQuery({
    queryKey: channelsQueryKeys.userChannels(workspaceId, filters),
    queryFn: () => channelsApi.getUserChannels(workspaceId, filters),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 60 * 1000,
  });
};

export function useGetChannel(workspaceId: string, channelId: string) {
  const qc = useQueryClient();

  return useQuery<ChannelEntity>({
    queryKey: channelsQueryKeys.channel(workspaceId, channelId),
    queryFn: () => channelsApi.getChannel(workspaceId, channelId),
    enabled: !!workspaceId && !!channelId,
    // 1. Seed from your list cache
    initialData: () =>
      qc.getQueryData<ChannelEntity[]>(['channels', workspaceId])?.find((c) => c.id === channelId),
    // 2. Don't refetch on every mount/focus
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export const useGetChannelWithMessagesInfinite = (
  workspaceId: string,
  channelId: string,
  limit: number = 50,
) => {
  return useInfiniteQuery({
    queryKey: channelsQueryKeys.channelMessagesInfinite(workspaceId, channelId),
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
    staleTime: 1000 * 30, // 30 seconds - allow refetch if data is older than this
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in memory for this long
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always refetch when component mounts to catch missed messages
    refetchOnReconnect: true, // Refetch when network reconnects
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

  return useMutation<ChannelEntity, Error, CreateChannelData, MutateCreateChannelContext>({
    mutationFn: (data: CreateChannelData) => channelsApi.createChannel(data),

    onMutate: async (variables): Promise<MutateCreateChannelContext> => {
      await queryClient.cancelQueries({
        queryKey: channelsQueryKeys.userChannels(variables.workspaceId),
      });

      const previousChannels = queryClient.getQueryData<ChannelEntity[]>(
        channelsQueryKeys.userChannels(variables.workspaceId),
      );

      return {
        workspaceId: variables.workspaceId,
        previousChannels: previousChannels || undefined,
      };
    },

    onSuccess: (newChannel, variables) => {
      queryClient.setQueryData<ChannelEntity[]>(
        channelsQueryKeys.userChannels(variables.workspaceId),
        (old) => (old ? [...old, newChannel] : [newChannel]),
      );
    },

    onError: (_, variables, context) => {
      if (context?.previousChannels) {
        queryClient.setQueryData<ChannelEntity[]>(
          channelsQueryKeys.userChannels(variables.workspaceId),
          context.previousChannels,
        );
      }
    },

    onSettled: (_data, _error, _variables, context) => {
      if (context?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: channelsQueryKeys.userChannels(context.workspaceId),
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

    onSuccess: (_, variables) => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channel(variables.workspaceId, variables.channelId),
      });
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channels(variables.workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.userChannels(variables.workspaceId),
      });
    },

    onError: (_, variables) => {
      // Invalidate related queries on error to ensure consistency
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channel(variables.workspaceId, variables.channelId),
      });
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channels(variables.workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.userChannels(variables.workspaceId),
      });
    },
  });
};

// Delete a channel
export const useDeleteChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, channelId }: { workspaceId: string; channelId: string }) =>
      channelsApi.deleteChannel(workspaceId, channelId),
    onSuccess: (_, variables) => {
      // Remove from channels list cache
      queryClient.setQueryData<ChannelEntity[]>(
        channelsQueryKeys.channels(variables.workspaceId),
        (old) => old?.filter((channel) => channel.id !== variables.channelId) || [],
      );

      // Remove from user channels cache
      queryClient.setQueryData<ChannelEntity[]>(
        channelsQueryKeys.userChannels(variables.workspaceId),
        (old) => old?.filter((channel) => channel.id !== variables.channelId) || [],
      );

      // Remove all related channel caches
      queryClient.removeQueries({
        queryKey: channelsQueryKeys.channel(variables.workspaceId, variables.channelId),
      });

      // Invalidate all channel-related queries for this workspace
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channels(variables.workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.userChannels(variables.workspaceId),
      });
    },
  });
};

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
        queryKey: channelsQueryKeys.channelMembers(variables.workspaceId, variables.channelId),
      });

      // Invalidate all channels queries to refresh membership status
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channels(variables.workspaceId),
      });

      // Invalidate user channels to refresh sidebar
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.userChannels(variables.workspaceId),
      });
    },
  });
};

// Remove channel member
export const useRemoveChannelMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, channelId, channelMemberIds }: RemoveChannelMembersParams) =>
      channelsApi.removeChannelMembers(workspaceId, channelId, channelMemberIds),

    onMutate: async ({ workspaceId, channelId, channelMemberIds, isCurrentUserLeaving }) => {
      await queryClient.cancelQueries({
        queryKey: channelsQueryKeys.channelMembers(workspaceId, channelId),
      });

      const previousMembers = queryClient.getQueryData<ChannelMemberResponse[]>(
        channelsQueryKeys.channelMembers(workspaceId, channelId),
      );

      queryClient.setQueryData<ChannelMemberResponse[]>(
        channelsQueryKeys.channelMembers(workspaceId, channelId),
        (old) =>
          old?.filter((member) => !channelMemberIds.includes(member.channel_member_id)) ?? [],
      );

      return { previousMembers, isCurrentUserLeaving };
    },

    onError: (_, { workspaceId, channelId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          channelsQueryKeys.channelMembers(workspaceId, channelId),
          context.previousMembers,
        );
      }
    },

    onSuccess: (_, { workspaceId, channelId, isCurrentUserLeaving }) => {
      if (isCurrentUserLeaving) {
        queryClient.setQueryData<ChannelEntity[]>(
          ['user-channels', workspaceId, null],
          (old) => old?.filter((channel) => channel.id !== channelId) ?? [],
        );
      }
    },

    onSettled: (_, __, { workspaceId, channelId }) => {
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channelMembers(workspaceId, channelId),
      });
      queryClient.invalidateQueries({
        queryKey: ['user-channels', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['channels', workspaceId],
      });
    },
  });
};

// Get channel members
export const useGetChannelMembers = (
  workspaceId: string,
  channelId: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: channelsQueryKeys.channelMembers(workspaceId, channelId),
    queryFn: () => channelsApi.getChannelMembers(workspaceId, channelId),
    enabled: !!(workspaceId && channelId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
