import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { channelsQueryKeys } from '@/features/channels/query-keys';
import { conversationsQueryKeys } from '@/features/conversations/query-keys';
import { membersQueryKeys } from '@/features/members/query-keys';
import { workspacesQueryKeys } from '@/features/workspaces/query-keys';
import { migrationApi } from '../api/migration-api';
import type { MigrationResult, StartMigrationData } from '../types';

export interface StartMigrationParams {
  workspaceId: string;
  data: StartMigrationData;
}

/**
 * Hook to start Slack migration
 */
export const useStartMigration = () => {
  const queryClient = useQueryClient();

  return useMutation<MigrationResult, Error, StartMigrationParams>({
    mutationFn: ({ workspaceId, data }) => migrationApi.startSlackMigration(workspaceId, data),

    onSuccess: (result, variables) => {
      const { workspaceId } = variables;

      // Invalidate all workspace-related data since we've imported new content
      queryClient.invalidateQueries({
        queryKey: workspacesQueryKeys.workspace(workspaceId),
      });

      // Invalidate all channels queries to show new imported channels
      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.channels(workspaceId),
      });

      queryClient.invalidateQueries({
        queryKey: channelsQueryKeys.userChannels(workspaceId),
      });

      queryClient.invalidateQueries({
        queryKey: conversationsQueryKeys.conversations(workspaceId),
      });

      // Invalidate workspace members to show new imported users
      queryClient.invalidateQueries({
        queryKey: membersQueryKeys.members(workspaceId),
      });
    },

    onError: () => {
      toast.error('Migration failed. Please try again.');
    },
  });
};
