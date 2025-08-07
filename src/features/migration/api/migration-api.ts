// features/migration/api/migration-api.ts
import api from '@/lib/api/axios-client';
import type {
  MigrationJobResponse,
  MigrationJobsResponse,
  MigrationJobStatus,
  MigrationJobStatusResponse,
  StartMigrationData,
} from '../types';

export const migrationApi = {
  /**
   * Start Slack migration process (now returns job ID immediately)
   */
  startSlackMigration: async (
    workspaceId: string,
    data: StartMigrationData,
  ): Promise<MigrationJobResponse> => {
    const { data: response } = await api.post<MigrationJobResponse>(
      `/workspaces/${workspaceId}/migrate/slack`,
      data,
    );
    return response;
  },

  /**
   * Get specific migration job status
   */
  getJobStatus: async (workspaceId: string, jobId: string): Promise<MigrationJobStatus> => {
    const { data: response } = await api.get<MigrationJobStatusResponse>(
      `/workspaces/${workspaceId}/migrate/jobs/${jobId}`,
    );
    return response.job;
  },

  /**
   * Get all migration jobs for a workspace
   */
  getAllJobs: async (workspaceId: string): Promise<MigrationJobStatus[]> => {
    const { data: response } = await api.get<MigrationJobsResponse>(
      `/workspaces/${workspaceId}/migrate/jobs`,
    );
    return response.jobs;
  },

  /**
   * Poll for job completion with exponential backoff
   */
  pollJobCompletion: async (
    workspaceId: string,
    jobId: string,
    onProgress?: (status: MigrationJobStatus) => void,
    maxAttempts: number = 60, // ~10 minutes with exponential backoff
  ): Promise<MigrationJobStatus> => {
    let attempts = 0;
    let delay = 2000; // Start with 2 second delay

    while (attempts < maxAttempts) {
      try {
        const status = await migrationApi.getJobStatus(workspaceId, jobId);

        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'completed' || status.status === 'failed') {
          return status;
        }

        // Exponential backoff with max delay of 30 seconds
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 30000)));
        delay = Math.min(delay * 1.2, 30000);
        attempts++;
      } catch (error) {
        console.warn(`Failed to get job status (attempt ${attempts + 1}):`, error);
        attempts++;

        // Wait before retrying, but with shorter delay on errors
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    throw new Error('Job polling timeout - maximum attempts reached');
  },
};
