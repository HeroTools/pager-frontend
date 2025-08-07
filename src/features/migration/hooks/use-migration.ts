// features/migration/hooks/use-migration.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { channelsQueryKeys } from '@/features/channels/query-keys';
import { conversationsQueryKeys } from '@/features/conversations/query-keys';
import { membersQueryKeys } from '@/features/members/query-keys';
import { workspacesQueryKeys } from '@/features/workspaces/query-keys';
import { migrationApi } from '../api/migration-api';
import type { MigrationJobResponse, MigrationJobStatus, StartMigrationData } from '../types';

export interface StartMigrationParams {
  workspaceId: string;
  data: StartMigrationData;
}

/**
 * Hook to start migration and poll for completion
 */
export const useStartMigration = () => {
  const queryClient = useQueryClient();
  const [currentJob, setCurrentJob] = useState<MigrationJobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const startMutation = useMutation<MigrationJobResponse, Error, StartMigrationParams>({
    mutationFn: ({ workspaceId, data }) => migrationApi.startSlackMigration(workspaceId, data),

    onSuccess: async (response, variables) => {
      const { workspaceId } = variables;

      try {
        setIsPolling(true);

        // Start polling for job completion
        const finalStatus = await migrationApi.pollJobCompletion(
          workspaceId,
          response.jobId,
          (status) => {
            setCurrentJob(status);
          },
        );

        if (finalStatus.status === 'completed') {
          // Invalidate all workspace-related data since we've imported new content
          queryClient.invalidateQueries({
            queryKey: workspacesQueryKeys.workspace(workspaceId),
          });

          queryClient.invalidateQueries({
            queryKey: channelsQueryKeys.channels(workspaceId),
          });

          queryClient.invalidateQueries({
            queryKey: channelsQueryKeys.userChannels(workspaceId),
          });

          queryClient.invalidateQueries({
            queryKey: conversationsQueryKeys.conversations(workspaceId),
          });

          queryClient.invalidateQueries({
            queryKey: membersQueryKeys.members(workspaceId),
          });

          toast.success('Migration completed successfully!');
        } else if (finalStatus.status === 'failed') {
          toast.error(finalStatus.error || 'Migration failed');
        }

        setCurrentJob(finalStatus);
      } catch (error) {
        console.error('Polling error:', error);
        toast.error('Lost connection to migration job. Please check status manually.');
      } finally {
        setIsPolling(false);
      }
    },

    onError: (error) => {
      console.error('Migration start error:', error);
      toast.error('Failed to start migration. Please try again.');
      setIsPolling(false);
    },
  });

  const reset = useCallback(() => {
    setCurrentJob(null);
    setIsPolling(false);
    startMutation.reset();
  }, [startMutation]);

  return {
    mutate: startMutation.mutate,
    mutateAsync: startMutation.mutateAsync,
    isLoading: startMutation.isPending,
    isPolling,
    currentJob,
    error: startMutation.error,
    data:
      currentJob?.status === 'completed'
        ? {
            success: true,
            results: currentJob.progress || {
              usersCreated: 0,
              channelsCreated: 0,
              conversationsCreated: 0,
              messagesImported: 0,
              reactionsAdded: 0,
            },
            message: 'Migration completed successfully',
          }
        : undefined,
    reset,
  };
};

/**
 * Hook to get job status with smart polling
 */
export const useJobStatus = (workspaceId: string, jobId: string | null) => {
  const [shouldPoll, setShouldPoll] = useState(true);

  const query = useQuery({
    queryKey: ['migration', 'job-status', workspaceId, jobId],
    queryFn: () => (jobId ? migrationApi.getJobStatus(workspaceId, jobId) : null),
    enabled: !!jobId,
    refetchInterval: shouldPoll ? 5000 : false, // Poll every 5 seconds or stop
    refetchIntervalInBackground: false,
  });

  // Stop polling when job is complete or failed
  useEffect(() => {
    if (query.data) {
      const status = query.data.status;
      if (status === 'completed' || status === 'failed') {
        setShouldPoll(false);
      }
    }
  }, [query.data]);

  return query;
};

/**
 * Hook to get all migration jobs for a workspace
 */
export const useMigrationJobs = (workspaceId: string) => {
  return useQuery({
    queryKey: ['migration', 'jobs', workspaceId],
    queryFn: () => migrationApi.getAllJobs(workspaceId),
  });
};
