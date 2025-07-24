import api from '@/lib/api/axios-client';
import type { MigrationResult, StartMigrationData } from '../types';

export const migrationApi = {
  /**
   * Start Slack migration process
   */
  startSlackMigration: async (
    workspaceId: string,
    data: StartMigrationData,
  ): Promise<MigrationResult> => {
    const { data: response } = await api.post<MigrationResult>(
      `/workspaces/${workspaceId}/migrate/slack`,
      data,
    );
    return response;
  },
};
